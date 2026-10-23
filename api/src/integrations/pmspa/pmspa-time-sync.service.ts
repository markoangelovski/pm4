import { Injectable } from "@nestjs/common";
import {
  BookedTimeException,
  TimeLogsService,
  todayIn
} from "../../time/time-logs.service.js";
import { WorkdaysService } from "../../time/workdays.service.js";
import type { SyncPreviewItemDto, SyncResultItemDto } from "./dto/sync.dto.js";
import { PmspaConnectionRepository } from "./pmspa-connection.repository.js";
import { cut, fingerprint } from "./pmspa-fields.js";
import {
  PmspaLinksRepository,
  type LinkRow
} from "./pmspa-links.repository.js";
import type { SyncSnapshot } from "./pmspa-preview.js";
import {
  PmspaRemote,
  type RemoteDay,
  type RemoteEvent,
  type RemoteLog
} from "./pmspa-remote.js";
import { PmspaSyncRepository } from "./pmspa-sync.repository.js";
import { CANT_LINK, result, RowFailure, type Run } from "./pmspa-run.js";
import { mappedGroup, type TimeSnapshot } from "./pmspa-time-preview.js";
import {
  formatDuration,
  groupDay,
  hoursToMinutes,
  isNonprod,
  isQuarterHours,
  pm4LogTuple,
  pmspaLogTuple,
  minuteToStart,
  startToMinute,
  type Pm4LogForPush,
  type PushGroup
} from "./pmspa-time-fields.js";

/** OQ-196: how many of an event's logs were imported, for a failure reason. */
function importedNote(n: number): string {
  if (n === 0) return "no other logs were imported";
  if (n === 1) return "1 other log was imported";
  return `${n} other logs were imported`;
}

/** The time snapshot of a day import or push (feat-int-time-api): the PMSPA days and the PM4 logs they map to. */
@Injectable()
export class PmspaTimeSyncService {
  constructor(
    private readonly remote: PmspaRemote,
    private readonly connections: PmspaConnectionRepository,
    private readonly links: PmspaLinksRepository,
    private readonly sync: PmspaSyncRepository,
    private readonly timeLogs: TimeLogsService,
    private readonly workdays: WorkdaysService
  ) {}

  /** The PMSPA days of `dates` not after the user's today, one `getDay` at a time; missing days are left out. */
  async readDays(
    userId: string,
    timeZone: string,
    dates: string[]
  ): Promise<RemoteDay[]> {
    const today = todayIn(timeZone);
    const out: RemoteDay[] = [];
    for (const date of dates) {
      if (date > today) continue;
      const day = await this.remote.getDay(userId, date);
      if (day) out.push(day);
    }
    return out;
  }

  /**
   * `base` plus the time data of `dates`: the PMSPA days of the dates not in the future, the PM4 logs of the dates
   * and of their linked logs, the time-log links, and the PM4 workday starts.
   */
  async loadTime(
    userId: string,
    base: SyncSnapshot,
    dates: string[],
    remoteDays: RemoteDay[]
  ): Promise<TimeSnapshot> {
    const today = todayIn(base.timeZone);
    const remoteLogIds = remoteDays.flatMap((d) =>
      d.events.flatMap((e) => e.logs.map((l) => l.id))
    );
    const pm4Starts = await this.sync.pm4Starts(userId, dates);
    const pmspaUserId =
      (await this.connections.find(userId))?.pmspaUserId ?? null;
    if (pmspaUserId === null) {
      const pm4Logs = await this.sync.pm4Logs(userId, { dates, ids: [] });
      return {
        ...base,
        today,
        remoteDays,
        pm4Logs,
        pm4Starts,
        logLinks: []
      };
    }
    const byPmspa = await this.links.logLinks(userId, pmspaUserId, {
      pm4Ids: [],
      pmspaIds: remoteLogIds
    });
    const pm4Logs = await this.sync.pm4Logs(userId, {
      dates,
      ids: byPmspa.map((l) => l.pm4Id)
    });
    const logLinks = await this.links.logLinks(userId, pmspaUserId, {
      pm4Ids: pm4Logs.map((l) => l.id),
      pmspaIds: remoteLogIds
    });
    return { ...base, today, remoteDays, pm4Logs, pm4Starts, logLinks };
  }

  /** API-INT-009, a day row: sets the PM4 workday start from PMSPA's when PM4 has none. */
  async importDayRow(
    run: Run,
    row: SyncPreviewItemDto
  ): Promise<SyncResultItemDto> {
    const s = run.snapshot as TimeSnapshot;
    const date = row.key.slice(row.key.indexOf(":") + 1);
    const start = s.remoteDays.find((d) => d.date === date)?.start ?? null;
    if (s.pm4Starts[date] === null && start !== null) {
      await this.workdays.setStart(run.userId, date, startToMinute(start) ?? 0);
    }
    return result(row, row.action === "create" ? "created" : "updated");
  }

  /** API-INT-009, an event row: its logs become PM4 logs (updated when linked), each linked as `imported`. */
  async importEventRow(
    run: Run,
    row: SyncPreviewItemDto
  ): Promise<SyncResultItemDto> {
    const { userId } = run;
    const s = run.snapshot as TimeSnapshot;
    const id = row.key.slice(row.key.indexOf(":") + 1);
    const event = remoteEvent(s, id);
    if (!event) throw new RowFailure(CANT_LINK);

    const taskId = event.taskId
      ? (run.links.pm4Of("task", event.taskId) ?? null)
      : null;
    const task =
      taskId === null ? null : await this.sync.pm4Task(userId, taskId);
    const nonprod = isNonprod(event.title);
    const placement = {
      taskId: task?.id ?? null,
      projectId: task?.projectId ?? null
    };

    const dayStart = startToMinute(
      s.remoteDays.find((d) => d.events.some((e) => e.id === event.id))
        ?.start ?? null
    );
    const dayStartMinute = dayStart ?? 0;
    const eventText = event.title.trim();

    let firstFailure: string | null = null;
    let failedLogs = 0;
    for (const log of event.logs) {
      const failure = logFailure(log, eventText);
      if (failure) {
        firstFailure ??= failure;
        failedLogs += 1;
        continue;
      }
      const text = log.title.trim() || cut(eventText, 1000);
      const fields = {
        workDate: event.date,
        durationMinutes: hoursToMinutes(log.duration),
        text,
        excludeFromStats: nonprod,
        dayStartMinute
      };
      const link = run.logLinks.get(log.id);
      let pm4Id: string;
      if (link) {
        // OQ-169: a linked log keeps its title. OQ-168: a nonprod log already excluded keeps its task and project.
        const current = s.pm4Logs.find((l) => l.id === link.pm4Id);
        const keep = nonprod && current?.excludeFromStats === true;
        try {
          pm4Id = (
            await this.timeLogs.update(
              userId,
              link.pm4Id,
              keep ? fields : { ...fields, ...placement }
            )
          ).id;
        } catch (e) {
          if (!(e instanceof BookedTimeException)) throw e;
          firstFailure ??= `${formatDuration(e.bookedMinutes)} of a log is booked in PM4: remove bookings first, or keep at least ${formatDuration(e.bookedMinutes)}`;
          failedLogs += 1;
          continue;
        }
      } else {
        pm4Id = (
          await this.timeLogs.create(userId, {
            ...fields,
            ...placement,
            title: cut(event.title.trim(), 100) || null
          })
        ).id;
      }
      await this.saveTimeLink(run, pm4Id, log, event);
    }

    if (firstFailure !== null) {
      return result(
        row,
        "failed",
        `${firstFailure} (${importedNote(event.logs.length - failedLogs)}).`
      );
    }
    return result(row, row.action === "create" ? "created" : "updated");
  }

  /** API-INT-011, the day row: writes nothing (the day's start goes with `createEvent`, D4). */
  pushDayRow(run: Run, row: SyncPreviewItemDto): Promise<SyncResultItemDto> {
    return Promise.resolve(
      result(row, row.action === "create" ? "created" : "updated")
    );
  }

  /** API-INT-011, an event row: the group's logs become the PMSPA event's logs (feat-int-time-api *Push commit*). */
  async pushEventRow(
    run: Run,
    row: SyncPreviewItemDto,
    date: string
  ): Promise<SyncResultItemDto> {
    const { userId } = run;
    const s = run.snapshot as TimeSnapshot;
    const key = row.key.slice(row.key.indexOf(":") + 1);
    const g = groupDay(s.pm4Logs.filter((l) => l.workDate === date)).find(
      (x) => x.key === key
    );
    if (!g) throw new RowFailure(CANT_LINK);

    let taskId: string | null = null;
    if (g.taskId !== null) {
      const t = run.links.pmspaOf("task", g.taskId);
      if (!t)
        throw new RowFailure("Its task isn't in PMSPA (it was left out).");
      taskId = t;
    }
    const group = hashGroup(run, g);
    const find = (d: RemoteDay | null | undefined) =>
      d?.events.find(
        (e) => e.taskId === taskId && (taskId !== null || e.title === g.title)
      );
    const day: RemoteDay | null =
      run.day !== undefined
        ? run.day
        : (s.remoteDays.find((d) => d.date === date) ?? null);
    const target = find(day);
    const text = (l: Pm4LogForPush) => cut(l.text, 350);
    const hours = (l: Pm4LogForPush) => l.durationMinutes / 60;
    const changed = (l: Pm4LogForPush, link: LinkRow) =>
      !fingerprint(pm4LogTuple(l, group)).equals(link.pm4Hash);

    // Moves out (D2, D10): a linked log whose PMSPA log isn't in the target event is deleted there.
    const moved = new Set<string>();
    const emptied = new Set<string>();
    const stay = new Map<string, LinkRow>();
    for (const l of g.logs) {
      const link = run.logLinks.get(l.id);
      if (!link) continue;
      if (target?.logs.some((x) => x.id === link.pmspaId)) {
        stay.set(l.id, link);
        continue;
      }
      const owner = day?.events.find((e) =>
        e.logs.some((x) => x.id === link.pmspaId)
      );
      await this.remote.deleteLog(userId, link.pmspaId);
      if (owner) emptied.add(owner.id);
      moved.add(l.id);
    }

    // Writes: `sent` are the logs created in PMSPA, in the order they were sent.
    const sent: Pm4LogForPush[] = [];
    const written = new Set<string>();
    if (!target) {
      await this.remote.createEvent(userId, {
        day: date,
        start: minuteToStart(s.pm4Starts[date] ?? 0),
        title: g.title,
        task: taskId,
        duration: hours(g.logs[0])
      });
      sent.push(g.logs[0]);
      if (g.logs.length > 1) {
        // createEvent returns nothing: the new event's id comes from a read, for the other logs.
        const id = find(await this.remote.getDay(userId, date))?.id;
        if (!id) throw new RowFailure(CANT_LINK);
        for (const l of g.logs.slice(1)) {
          await this.remote.createLog(userId, id, {
            title: text(l),
            duration: hours(l)
          });
          sent.push(l);
        }
      }
    } else {
      for (const l of g.logs) {
        const link = stay.get(l.id);
        if (link) {
          if (changed(l, link)) {
            await this.remote.updateLog(userId, link.pmspaId, {
              title: text(l),
              duration: hours(l)
            });
            written.add(l.id);
          }
        } else {
          await this.remote.createLog(userId, target.id, {
            title: text(l),
            duration: hours(l)
          });
          sent.push(l);
        }
      }
    }
    for (const l of sent) written.add(l.id);

    // D3: re-read the day once, and link by position.
    const fresh = await this.remote.getDay(userId, date);
    const event = find(fresh);
    if (!fresh || !event) throw new RowFailure(CANT_LINK);
    const count = sent.length;
    if (event.logs.length < count) throw new RowFailure(CANT_LINK);
    const created = new Map<string, RemoteLog>();
    event.logs
      .slice(event.logs.length - count)
      .forEach((log, i) => created.set(sent[i].id, log));
    const first = sent[0];
    const firstLog = first && created.get(first.id);
    if (!target && first && firstLog && firstLog.title !== text(first)) {
      await this.remote.updateLog(userId, firstLog.id, {
        title: text(first),
        duration: hours(first)
      });
      created.set(first.id, { ...firstLog, title: text(first) });
    }

    for (const l of g.logs) {
      if (!written.has(l.id)) continue;
      const pmspaId = created.get(l.id)?.id ?? stay.get(l.id)?.pmspaId;
      const log = created.get(l.id) ?? event.logs.find((x) => x.id === pmspaId);
      if (!log) throw new RowFailure(CANT_LINK);
      const link: LinkRow = {
        type: "time-log",
        pm4Id: l.id,
        pmspaId: log.id,
        pmspaUserId: run.pmspaUserId,
        origin: "pushed",
        syncedAt: run.now,
        pm4Hash: fingerprint(pm4LogTuple(l, group)),
        pmspaHash: fingerprint(pmspaLogTuple(log, event))
      };
      await this.links.save(userId, link);
      run.logLinks.set(l.id, link);
    }

    // An event left without logs by a move is deleted.
    let events = fresh.events;
    for (const id of emptied) {
      const left = fresh.events.find((e) => e.id === id);
      if (left && left.logs.length === 0) {
        await this.remote.deleteEvent(userId, fresh.id, id);
        events = events.filter((e) => e.id !== id);
      }
    }
    run.day = { ...fresh, events };
    return result(row, row.action === "create" ? "created" : "updated");
  }

  /** Saves the `imported` link of a PMSPA log to its PM4 log, with both fingerprints, and adds it to the run. */
  private async saveTimeLink(
    run: Run,
    pm4Id: string,
    log: RemoteLog,
    event: RemoteEvent
  ): Promise<void> {
    const [pm4] = await this.sync.pm4Logs(run.userId, {
      dates: [],
      ids: [pm4Id]
    });
    if (!pm4) throw new RowFailure(CANT_LINK);
    const group = hashGroup(run, groupDay([pm4])[0]);
    const link: LinkRow = {
      type: "time-log",
      pm4Id,
      pmspaId: log.id,
      pmspaUserId: run.pmspaUserId,
      origin: "imported",
      syncedAt: run.now,
      pm4Hash: fingerprint(pm4LogTuple(pm4, group)),
      pmspaHash: fingerprint(pmspaLogTuple(log, event))
    };
    await this.links.save(run.userId, link);
    run.logLinks.set(log.id, link);
  }
}

/**
 * The task key of a time-log hash: `mappedGroup`'s rule (all the snapshot's task links, else the title), plus the
 * task links created earlier in this run, which the next preview will find saved. Previews compare with this rule.
 */
function hashGroup(run: Run, g: PushGroup): string {
  const made =
    g.taskId === null ? undefined : run.links.pmspaOf("task", g.taskId);
  return made ?? mappedGroup(g, run.snapshot as TimeSnapshot);
}

/**
 * OQ-194: why a PMSPA log can't be imported, or null. The first failed log's reason ends the row's message.
 * Checks run in this order: the quarter-hour step, the 0.25…24 h range, the text length, and last the text
 * (a blank log title takes the trimmed event title; both blank → "A log has no text").
 */
function logFailure(log: RemoteLog, eventTitle: string): string | null {
  if (!isQuarterHours(log.duration))
    return `A log of ${log.duration} h isn't in 0.25 h steps`;
  if (log.duration < 0.25 || log.duration > 24)
    return `A log of ${log.duration} h isn't between 0.25 h and 24 h`;
  if (log.title.trim().length > 1000)
    return "A log's text is over 1000 characters";
  if (log.title.trim() === "" && eventTitle === "") return "A log has no text";
  return null;
}

/** The PMSPA event with `id` among the snapshot's days. */
function remoteEvent(s: TimeSnapshot, id: string): RemoteEvent | undefined {
  for (const d of s.remoteDays)
    for (const e of d.events) if (e.id === id) return e;
  return undefined;
}
