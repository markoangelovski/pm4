import { fingerprint } from "./pmspa-fields.js";
import type { SyncPreviewItemDto } from "./dto/sync.dto.js";
import type { PmspaImportSelectionDto } from "./dto/sync.dto.js";
import type { LinkRow } from "./pmspa-links.repository.js";
import {
  importBuilder,
  row,
  selectProjects,
  syncBuilder,
  usableLinks,
  type SyncSnapshot
} from "./pmspa-preview.js";
import type { RemoteDay, RemoteEvent, RemoteLog } from "./pmspa-remote.js";
import type { RemoteTask } from "./pmspa-fields.js";
import {
  formatDuration,
  formatWorkDate,
  groupDay,
  hoursToMinutes,
  isNonprod,
  isQuarterHours,
  minuteToStart,
  NONPROD,
  plural,
  pm4LogTuple,
  pmspaLogTuple,
  type Pm4LogForPush,
  type PushGroup
} from "./pmspa-time-fields.js";

// The preview rows of a day import and a day push (feat-int-time-api T2): a pure port of the prototype's day parts
// (`importPreview`, `pushPreview` in web/proto/mock/pmspa.ts) over a snapshot. No I/O.

export interface Pm4DayLog extends Pm4LogForPush {
  workDate: string;
}

export interface TimeSnapshot extends SyncSnapshot {
  /** The user's today (YYYY-MM-DD, user zone). */
  today: string;
  /** Import: the day of each selected date not in the future. Push: the pushed date's day (or none). */
  remoteDays: RemoteDay[];
  /** PM4 logs on the snapshot's dates and every PM4 log linked by `logLinks`, in entry order (id). */
  pm4Logs: Pm4DayLog[];
  /** The PM4 workday start (minute) of each snapshot date. */
  pm4Starts: Record<string, number | null>;
  /** Active time-log links whose `pm4Id` is in `pm4Logs` or whose `pmspaId` is a log of `remoteDays`. */
  logLinks: LinkRow[];
}

type Item = SyncPreviewItemDto;
type Action = "create" | "update" | "skip";

const remoteLogs = (s: TimeSnapshot): Map<string, RemoteEvent> => {
  const map = new Map<string, RemoteEvent>();
  for (const d of s.remoteDays)
    for (const e of d.events) for (const l of e.logs) map.set(l.id, e);
  return map;
};

/** D11: the time-log links usable in `mode`. */
export function usableLogLinks(
  s: TimeSnapshot,
  mode: "import" | "push"
): LinkRow[] {
  const ids = new Set(s.pm4Logs.map((l) => l.id));
  const remote = remoteLogs(s);
  return s.logLinks.filter(
    (l) => ids.has(l.pm4Id) && (mode === "push" || remote.has(l.pmspaId))
  );
}

/**
 * D1: the group key mapped to PMSPA: the PMSPA task id of the group's task, looked up in all the snapshot's task
 * links (usable or not), else "title:" + the title. Every time-log hash is written and compared with this rule.
 */
export function mappedGroup(g: PushGroup, s: TimeSnapshot): string {
  const link =
    g.taskId === null
      ? undefined
      : s.links.find((l) => l.type === "task" && l.pm4Id === g.taskId);
  return link ? link.pmspaId : `title:${g.title}`;
}

/** "a", "a and b", "a, b and c". */
const and = (items: string[]): string =>
  items.length <= 1
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

const eventDetail = (n: number, minutes: number) =>
  `${plural(n, "log")} · ${formatDuration(minutes)}`;

/** All linked: update when any changed, else skip. Some linked: update. None: create. */
function linkedAction(total: number, linked: number, changed: number): Action {
  if (linked === 0) return "create";
  if (linked < total) return "update";
  return changed > 0 ? "update" : "skip";
}

const unchanged = (total: number, linked: number, changed: number) =>
  total > 0 && linked === total && changed === 0;

const pm4ChangedOf = (l: Pm4LogForPush, link: LinkRow, s: TimeSnapshot) =>
  !fingerprint(pm4LogTuple(l, mappedGroup(groupDay([l])[0], s))).equals(
    link.pm4Hash
  );

const pmspaChangedOf = (log: RemoteLog, e: RemoteEvent, link: LinkRow) =>
  !fingerprint(pmspaLogTuple(log, e)).equals(link.pmspaHash);

const pad = (n: number) => String(n).padStart(2, "0");
const clock = (start: number) => {
  const total = Math.round(start * 60);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
};

/** The rows of a day import preview: the selected projects and tasks, then for each date its parents, the day and its events. */
export function importTimeRows(
  s: TimeSnapshot,
  sel: PmspaImportSelectionDto
): SyncPreviewItemDto[] {
  const b = importBuilder(s);
  selectProjects(b, s, sel);
  const links = usableLogLinks(s, "import");
  const byPmspa = new Map(links.map((l) => [l.pmspaId, l]));
  const taskLinks = usableLinks(s).filter((l) => l.type === "task");
  const pm4Log = new Map(s.pm4Logs.map((l) => [l.id, l]));

  const sorted = [...(sel.dates ?? [])].sort();
  const taskOf = (e: RemoteEvent) =>
    s.remoteTasks.find((t) => t.id === e.taskId) ?? null;
  // D10: every unlinked event task, once, before any day row, with the dates it appears on.
  const parents = new Map<
    string,
    { task: RemoteTask; count: number; dates: string[] }
  >();
  for (const date of sorted) {
    if (date > s.today) continue;
    const events = s.remoteDays.find((d) => d.date === date)?.events ?? [];
    for (const e of events) {
      const t = taskOf(e);
      if (!t || taskLinks.some((l) => l.pmspaId === t.id)) continue;
      const p = parents.get(t.id) ?? { task: t, count: 0, dates: [] };
      p.count += 1;
      if (!p.dates.includes(date)) p.dates.push(date);
      parents.set(t.id, p);
    }
  }
  for (const { task, count, dates } of parents.values())
    b.addTask(
      task,
      `Parent of ${count === 1 ? "an imported event" : "imported events"} from ${and(dates.map(formatWorkDate))}`
    );

  for (const date of sorted) {
    const dayKey = `day:${date}`;
    if (date > s.today) {
      b.items.push(
        row({
          key: dayKey,
          type: "day",
          title: formatWorkDate(date),
          action: "skip",
          reason: "In the future: PM4 doesn't log future time."
        })
      );
      continue;
    }
    const events = s.remoteDays.find((d) => d.date === date)?.events ?? [];

    /** The link of a PMSPA log, and whether the PMSPA side and the PM4 side changed since it. */
    const state = (log: RemoteLog, e: RemoteEvent) => {
      const link = byPmspa.get(log.id);
      if (!link) return null;
      const l = pm4Log.get(link.pm4Id);
      return {
        link,
        pmspaChanged: pmspaChangedOf(log, e, link),
        pm4Changed: l ? pm4ChangedOf(l, link, s) : false
      };
    };
    const stateOf = (list: RemoteEvent[]) => {
      const states = list.flatMap((e) => e.logs.map((log) => state(log, e)));
      const linked = states.filter((x) => x !== null);
      return {
        total: states.length,
        linked: linked.length,
        changed: linked.filter((x) => x.pmspaChanged).length
      };
    };
    const minutesOf = (list: RemoteEvent[]) =>
      list.reduce(
        (sum, e) =>
          sum + e.logs.reduce((m, l) => m + hoursToMinutes(l.duration), 0),
        0
      );

    const day = stateOf(events);
    b.items.push(
      row({
        key: dayKey,
        type: "day",
        title: formatWorkDate(date),
        detail: eventDetail(day.total, minutesOf(events)),
        action:
          day.total === 0
            ? "skip"
            : linkedAction(day.total, day.linked, day.changed),
        reason:
          day.total === 0
            ? "No logs"
            : unchanged(day.total, day.linked, day.changed)
              ? "Already imported"
              : null
      })
    );

    for (const e of events) {
      const t = taskOf(e);
      const st = stateOf([e]);
      const warnings: string[] = [];
      const offStep = e.logs.filter((l) => !isQuarterHours(l.duration));
      if (offStep.length)
        warnings.push(
          `${plural(offStep.length, "log")} of ${offStep.map((l) => `${l.duration} h`).join(", ")} isn't in 0.25 h steps and will fail.`
        );
      const outOfRange = e.logs.filter(
        (l) =>
          isQuarterHours(l.duration) && (l.duration < 0.25 || l.duration > 24)
      );
      if (outOfRange.length)
        warnings.push(
          `${plural(outOfRange.length, "log")} of ${outOfRange.map((l) => `${l.duration} h`).join(", ")} isn't between 0.25 h and 24 h and will fail.`
        );
      const tooLong = e.logs.filter(
        (l) =>
          isQuarterHours(l.duration) &&
          l.duration >= 0.25 &&
          l.duration <= 24 &&
          l.title.trim().length > 1000
      );
      if (tooLong.length)
        warnings.push(
          `${plural(tooLong.length, "log")} with a text over 1000 characters will fail.`
        );
      const counterpart = t
        ? taskLinks.find((l) => l.pmspaId === t.id)?.pm4Id
        : undefined;
      if (t && counterpart) {
        const moved = e.logs.filter((log) => {
          const link = byPmspa.get(log.id);
          const l = link && pm4Log.get(link.pm4Id);
          return l && l.task?.id !== counterpart;
        });
        if (moved.length)
          warnings.push(
            `${plural(moved.length, "PM4 log")} moves to “${t.title}” (its task changed in PMSPA).`
          );
      }
      const both = e.logs.filter((log) => {
        const x = state(log, e);
        return x && x.pmspaChanged && x.pm4Changed;
      }).length;
      if (both)
        warnings.push(
          `${plural(both, "log")} also changed in PM4 since the last sync: PM4's version is overwritten.`
        );
      if (e.booked)
        warnings.push("Booked in PMSPA: imported logs aren't booked.");
      b.items.push(
        row({
          key: `event:${e.id}`,
          parentKey: dayKey,
          type: "event",
          title: e.title,
          ...(t
            ? {
                taskPath: {
                  projectTitle:
                    s.remoteProjects.find((p) => p.id === t.projectId)?.title ??
                    "?",
                  taskTitle: t.title
                }
              }
            : {}),
          detail: t
            ? eventDetail(e.logs.length, minutesOf([e]))
            : `${
                isNonprod(e.title)
                  ? "No task → Unsorted, excluded from statistics"
                  : "No task → Unsorted"
              } · ${eventDetail(e.logs.length, minutesOf([e]))}`,
          action:
            st.total === 0
              ? "skip"
              : linkedAction(st.total, st.linked, st.changed),
          reason:
            st.total === 0
              ? "No logs"
              : unchanged(st.total, st.linked, st.changed)
                ? "Already imported"
                : null,
          warnings
        })
      );
    }
  }
  return b.items;
}

/** The rows of a day push preview: the unlinked tasks the day's events need, the day and one row per event. */
export function pushDayRows(
  s: TimeSnapshot,
  date: string
): SyncPreviewItemDto[] {
  const logs = s.pm4Logs.filter((l) => l.workDate === date);
  const groups = groupDay(logs);
  if (groups.length === 0) return [];
  const b = syncBuilder(s, null);
  const taskLinks = usableLinks(s).filter((l) => l.type === "task");
  for (const g of groups) {
    const t = g.taskId && s.pm4Tasks.find((x) => x.id === g.taskId);
    if (t && !taskLinks.some((l) => l.pm4Id === t.id))
      b.taskRow(t, { parentOf: "Parent of the day's logs" });
  }

  const links = usableLogLinks(s, "push");
  const byPm4 = new Map(links.map((l) => [l.pm4Id, l]));
  const remote = remoteLogs(s);
  const day = s.remoteDays.find((d) => d.date === date);
  const dayEvents = day?.events ?? [];

  const pmspaChanged = (l: Pm4LogForPush) => {
    const link = byPm4.get(l.id);
    const e = link && remote.get(link.pmspaId);
    const log = e?.logs.find((x) => x.id === link!.pmspaId);
    return link && e && log ? pmspaChangedOf(log, e, link) : false;
  };
  const pm4Changed = (l: Pm4LogForPush) => {
    const link = byPm4.get(l.id);
    return link ? pm4ChangedOf(l, link, s) : false;
  };
  /** D10: a log whose PMSPA log isn't in the pushed day counts as changed. */
  const inDay = (l: Pm4LogForPush) => {
    const link = byPm4.get(l.id);
    return Boolean(
      link && dayEvents.some((e) => e.logs.some((x) => x.id === link.pmspaId))
    );
  };
  const changedForPush = (l: Pm4LogForPush) =>
    pm4Changed(l) || (byPm4.has(l.id) && !inDay(l));
  const state = (list: Pm4LogForPush[]) => ({
    total: list.length,
    linked: list.filter((l) => byPm4.has(l.id)).length,
    changed: list.filter((l) => byPm4.has(l.id) && changedForPush(l)).length
  });
  const minutesOf = (list: Pm4LogForPush[]) =>
    list.reduce((sum, l) => sum + l.durationMinutes, 0);

  const all = groups.flatMap((g) => g.logs);
  const groupStates = groups.map((g) => state(g.logs));
  const eventActions = groupStates.map((x) =>
    linkedAction(x.total, x.linked, x.changed)
  );
  const dayState = state(all);
  const dayWarnings: string[] = [];
  const wanted = minuteToStart(s.pm4Starts[date] ?? 0);
  if (
    !eventActions.includes("create") &&
    day &&
    day.start !== null &&
    day.start !== wanted
  )
    dayWarnings.push(
      `PMSPA keeps ${clock(day.start)}: a day's start changes only when an event is added.`
    );
  const dayKey = `day:${date}`;
  const rows: Item[] = [
    row({
      key: dayKey,
      type: "day",
      title: formatWorkDate(date),
      detail: `${plural(groups.length, "event")} · ${eventDetail(all.length, minutesOf(all))}`,
      action: linkedAction(dayState.total, dayState.linked, dayState.changed),
      reason: unchanged(dayState.total, dayState.linked, dayState.changed)
        ? "No changes since the last sync"
        : null,
      warnings: dayWarnings
    })
  ];

  const pushedTaskPath = (
    g: PushGroup
  ): { projectTitle: string; taskTitle: string } | null => {
    if (g.title === NONPROD && g.logs.some((l) => l.excludeFromStats))
      return null;
    if (!g.taskId) return null;
    const link = taskLinks.find((l) => l.pm4Id === g.taskId);
    const rt = link && s.remoteTasks.find((t) => t.id === link.pmspaId);
    if (rt)
      return {
        projectTitle:
          s.remoteProjects.find((p) => p.id === rt.projectId)?.title ?? "?",
        taskTitle: rt.title
      };
    const task = g.logs.find((l) => l.task?.id === g.taskId)?.task;
    return {
      projectTitle:
        g.logs.find((l) => l.project?.id === g.projectId)?.project?.title ??
        "?",
      taskTitle: task?.title ?? "?"
    };
  };

  groups.forEach((g, i) => {
    const warnings: string[] = [];
    const long = g.logs.filter((l) => l.text.length > 350).length;
    if (long)
      warnings.push(
        `${plural(long, "log text")} over 350 characters: cut to 349 + “…”.`
      );
    // The target event: the first of the day with the group's PMSPA task, or (no task) the group's title.
    const taskId =
      g.taskId === null
        ? null
        : (taskLinks.find((l) => l.pm4Id === g.taskId)?.pmspaId ?? undefined);
    const target =
      taskId === undefined
        ? undefined
        : dayEvents.find(
            (e) =>
              e.taskId === taskId && (taskId !== null || e.title === g.title)
          );
    const linked = g.logs.filter((l) => byPm4.has(l.id));
    const moved = linked.filter((l) => {
      const e = dayEvents.find((x) =>
        x.logs.some((y) => y.id === byPm4.get(l.id)!.pmspaId)
      );
      return e && e.id !== target?.id;
    }).length;
    if (moved)
      warnings.push(
        `${plural(moved, "log")} moves here in PMSPA from another event; an event left empty is deleted.`
      );
    const elsewhere = linked.filter((l) => !inDay(l)).length;
    if (elsewhere)
      warnings.push(
        `${plural(elsewhere, "log")} moves here in PMSPA from another day; an event left empty there stays.`
      );
    if (g.note) warnings.push(g.note);
    const both = linked.filter((l) => pm4Changed(l) && pmspaChanged(l)).length;
    if (both)
      warnings.push(
        `${plural(both, "log")} also changed in PMSPA since the last sync: PMSPA's version is overwritten.`
      );
    const st = groupStates[i];
    const path = pushedTaskPath(g);
    const noTask =
      g.title === NONPROD && g.logs.some((l) => l.excludeFromStats)
        ? "No task · Excluded from statistics"
        : "No task";
    rows.push(
      row({
        key: `event:${g.key}`,
        parentKey: dayKey,
        type: "event",
        title: g.title,
        ...(path ? { taskPath: path } : {}),
        detail: path
          ? eventDetail(g.logs.length, minutesOf(g.logs))
          : `${noTask} · ${eventDetail(g.logs.length, minutesOf(g.logs))}`,
        action: eventActions[i],
        reason: unchanged(st.total, st.linked, st.changed)
          ? "No changes since the last sync"
          : null,
        warnings
      })
    );
  });
  return [...b.items, ...rows];
}
