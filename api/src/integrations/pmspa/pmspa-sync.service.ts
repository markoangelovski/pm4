import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { ProjectsService } from "../../projects/projects.service.js";
import { TasksService } from "../../tasks/tasks.service.js";
import { todayIn } from "../../time/time-logs.service.js";
import type {
  PmspaImportDto,
  PmspaImportSelectionDto,
  PmspaPushDto,
  PmspaPushTargetDto,
  PmspaSyncDto,
  PmspaSyncTargetDto,
  SyncChoiceDto,
  SyncPreviewDto,
  SyncPreviewItemDto,
  SyncResultDto,
  SyncResultItemDto
} from "./dto/sync.dto.js";
import { PmspaConnectionRepository } from "./pmspa-connection.repository.js";
import {
  PmspaLinksRepository,
  type LinkRow
} from "./pmspa-links.repository.js";
import { PmspaRemote, PmspaWriteError } from "./pmspa-remote.js";
import {
  fingerprint,
  projectTuple,
  taskTuple,
  type Pm4Task,
  type RemoteProject,
  type RemoteTask
} from "./pmspa-fields.js";
import {
  choiceFor,
  importRows,
  syncRows,
  type SyncDirection,
  type SyncSnapshot
} from "./pmspa-preview.js";
import { pmspaProblems } from "./pmspa-problems.js";
import { PmspaStore } from "./pmspa-store.js";
import {
  toPm4Project,
  toPm4Task,
  toPmspaProject,
  toPmspaTask
} from "./pmspa-writes.js";
import { PmspaSyncRepository } from "./pmspa-sync.repository.js";
import { PmspaTimeSyncService } from "./pmspa-time-sync.service.js";
import {
  importTimeRows,
  pushDayRows,
  usableLogLinks,
  type TimeSnapshot
} from "./pmspa-time-preview.js";
import { UsersRepository } from "../../users/users.repository.js";
import {
  CANT_LINK,
  result,
  RowFailure,
  RunLinks,
  type PairType,
  type Run
} from "./pmspa-run.js";

const OVERWRITTEN: Record<SyncDirection, string> = {
  "to-pmspa": "PMSPA overwritten with PM4's version",
  "to-pm4": "PM4 overwritten with PMSPA's version"
};
const NO_PMSPA_PROJECT = "Its project isn't in PMSPA (it was left out).";
const NO_PM4_PROJECT = "Its project wasn't imported.";
/** The import and sync, previews and commits (feat-int-sync-api API-INT-008/009, API-INT-015/016). */
@Injectable()
export class PmspaSyncService {
  constructor(
    private readonly remote: PmspaRemote,
    private readonly connections: PmspaConnectionRepository,
    private readonly links: PmspaLinksRepository,
    private readonly sync: PmspaSyncRepository,
    private readonly users: UsersRepository,
    private readonly store: PmspaStore,
    private readonly projectsService: ProjectsService,
    private readonly tasksService: TasksService,
    private readonly timeSync: PmspaTimeSyncService
  ) {}

  /**
   * The snapshot a preview is computed from: PMSPA's projects and tasks (only the selected projects' tasks when
   * `sel` is given), the caller's PM4 projects and tasks, and the active links of the connected account.
   * With `sel.dates`, the time data of those days too (a `TimeSnapshot`).
   */
  async load(
    userId: string,
    sel: PmspaImportSelectionDto | null
  ): Promise<SyncSnapshot> {
    const remoteProjects = await this.remote.listProjects(userId);

    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException("Missing or invalid access token.");
    }

    const pmspaUserId =
      (await this.connections.find(userId))?.pmspaUserId ?? null;
    const links: LinkRow[] =
      pmspaUserId === null
        ? []
        : [
            ...(await this.links.active(userId, pmspaUserId, "project")),
            ...(await this.links.active(userId, pmspaUserId, "task"))
          ];

    const pm4Projects = await this.sync.pm4Projects(userId);
    const pm4Tasks = await this.sync.pm4Tasks(userId);

    // An event's task may be outside the selected projects, so a time import reads all of PMSPA's tasks.
    let remoteTasks: RemoteTask[];
    if (sel && !sel.dates?.length) {
      const selected = new Set(
        sel.projects
          .map((p) => p.id)
          .filter((id) => remoteProjects.some((r) => r.id === id))
      );
      remoteTasks = (
        await Promise.all(
          [...selected].map((id) => this.remote.listTasks(userId, id))
        )
      ).flat();
    } else {
      remoteTasks = await this.remote.listAllTasks(userId);
    }

    const base: SyncSnapshot = {
      timeZone: user.timeZone,
      pm4Projects,
      pm4Tasks,
      remoteProjects,
      remoteTasks,
      links
    };
    if (sel?.dates?.length)
      return this.timeSync.loadTime(userId, base, sel.dates);
    return base;
  }

  /** API-INT-008: the rows of an import of the selected PMSPA projects and tasks, and of the selected days. */
  async importPreview(
    userId: string,
    sel: PmspaImportSelectionDto
  ): Promise<SyncPreviewDto> {
    const snapshot = await this.load(userId, sel);
    if (sel.dates?.length) {
      // `load` returns a TimeSnapshot when the selection has dates.
      return { items: importTimeRows(snapshot as TimeSnapshot, sel) };
    }
    return { items: importRows(snapshot, sel) };
  }

  /** API-INT-010: the rows of a push of one PM4 day to PMSPA. 400 for a future date. */
  async pushPreview(
    userId: string,
    target: PmspaPushTargetDto
  ): Promise<SyncPreviewDto> {
    const base = await this.load(userId, null);
    if (target.id > todayIn(base.timeZone)) {
      throw new BadRequestException({
        errors: [{ field: "id", message: "The date is in the future." }]
      });
    }
    const snapshot = await this.timeSync.loadTime(userId, base, [target.id]);
    return { items: pushDayRows(snapshot, target.id) };
  }

  /** API-INT-011: pushes one PM4 day to PMSPA, row by row. 400 for a future date. */
  pushRun(userId: string, dto: PmspaPushDto): Promise<SyncResultDto> {
    return this.commit(
      userId,
      "pm4",
      dto.choices,
      (snapshot) => pushDayRows(snapshot as TimeSnapshot, dto.target.id),
      null,
      dto.target.id
    );
  }

  /** API-INT-015: the rows of a sync of a PM4 project or task. 404 when the record isn't the caller's. */
  async syncPreview(
    userId: string,
    target: PmspaSyncTargetDto
  ): Promise<SyncPreviewDto> {
    const items = syncRows(await this.load(userId, null), target);
    if (!items) {
      throw new NotFoundException(
        target.type === "project" ? "Project not found." : "Task not found."
      );
    }
    return { items };
  }

  /** API-INT-009: imports the selection, row by row. */
  importRun(userId: string, dto: PmspaImportDto): Promise<SyncResultDto> {
    return this.commit(
      userId,
      "pmspa",
      dto.choices,
      (snapshot) =>
        dto.selection.dates?.length
          ? importTimeRows(snapshot as TimeSnapshot, dto.selection)
          : importRows(snapshot, dto.selection),
      dto.selection
    );
  }

  /** API-INT-016: syncs a PM4 project or task, row by row. 404 when the record isn't the caller's. */
  syncRun(userId: string, dto: PmspaSyncDto): Promise<SyncResultDto> {
    return this.commit(
      userId,
      "pm4",
      dto.choices,
      (snapshot) => {
        const rows = syncRows(snapshot, dto.target);
        if (!rows) {
          throw new NotFoundException(
            dto.target.type === "project"
              ? "Project not found."
              : "Task not found."
          );
        }
        return rows;
      },
      null
    );
  }

  private async commit(
    userId: string,
    from: "pm4" | "pmspa",
    choices: SyncChoiceDto[],
    rowsOf: (snapshot: SyncSnapshot) => SyncPreviewItemDto[],
    sel: PmspaImportSelectionDto | null,
    pushDate: string | null = null
  ): Promise<SyncResultDto> {
    if (!(await this.store.lock(userId))) throw pmspaProblems.syncRunning();
    try {
      const now = new Date();
      let snapshot: SyncSnapshot;
      if (pushDate) {
        const base = await this.load(userId, null);
        if (pushDate > todayIn(base.timeZone)) {
          throw new BadRequestException({
            errors: [{ field: "id", message: "The date is in the future." }]
          });
        }
        snapshot = await this.timeSync.loadTime(userId, base, [pushDate]);
      } else {
        snapshot = await this.load(userId, sel);
      }
      const rows = rowsOf(snapshot);
      const pmspaUserId = (await this.connections.find(userId))?.pmspaUserId;
      if (!pmspaUserId) throw pmspaProblems.notConnected();
      const run: Run = {
        userId,
        now,
        from,
        snapshot,
        pmspaUserId,
        links: new RunLinks(snapshot),
        logLinks: new Map(
          pushDate
            ? usableLogLinks(snapshot as TimeSnapshot, "push").map((l) => [
                l.pm4Id,
                l
              ])
            : sel?.dates?.length
              ? usableLogLinks(snapshot as TimeSnapshot, "import").map((l) => [
                  l.pmspaId,
                  l
                ])
              : []
        )
      };
      const items: SyncResultItemDto[] = [];
      for (const row of rows) {
        const choice = choiceFor(choices, row);
        if (choice.kind === "skip" || row.action === "skip") {
          items.push(result(row, "skipped", row.reason ?? "Left out"));
          continue;
        }
        try {
          items.push(await this.applyRow(run, row, choice));
        } catch (e) {
          if (e instanceof RowFailure || e instanceof PmspaWriteError) {
            items.push(result(row, "failed", e.message));
          } else {
            throw e;
          }
        }
      }
      await this.connections.setLastSyncAt(userId, now);
      return { items, syncedAt: now.toISOString() };
    } finally {
      await this.store.unlock(userId);
    }
  }

  /** One row: a day or event row of a time import, else a project or task pair. */
  private applyRow(
    run: Run,
    row: SyncPreviewItemDto,
    choice: SyncChoiceDto
  ): Promise<SyncResultItemDto> {
    const push = run.from === "pm4";
    if (row.type === "day") {
      return push
        ? this.timeSync.pushDayRow(run, row)
        : this.timeSync.importDayRow(run, row);
    }
    if (row.type === "event") {
      return push
        ? this.timeSync.pushEventRow(
            run,
            row,
            (row.parentKey ?? "").slice("day:".length)
          )
        : this.timeSync.importEventRow(run, row);
    }
    return this.syncPair(run, row, choice);
  }

  /** One project or task row (the prototype's `syncPair`). */
  private async syncPair(
    run: Run,
    row: SyncPreviewItemDto,
    choice: SyncChoiceDto
  ): Promise<SyncResultItemDto> {
    const type = row.type as PairType;
    const id = row.key.slice(row.key.indexOf(":") + 1);
    let other: string | null = row.linkedId;
    const fromChoice = !other && choice.kind === "link";
    if (!other && choice.kind === "link") {
      if (!choice.id || !row.candidates.some((c) => c.id === choice.id)) {
        return result(row, "failed", CANT_LINK);
      }
      other = choice.id;
    }
    if (!other) return this.createPair(run, row, type, id);

    const [pm4Id, pmspaId] = run.from === "pm4" ? [id, other] : [other, id];
    const direction: SyncDirection | null =
      choice.kind === "link" ? (choice.overwrite ?? null) : null;
    // D9: a PMSPA record picked by the user may be gone by now.
    const chosenPmspa = fromChoice && run.from === "pm4";
    if (chosenPmspa && !(await this.readRemote(run, type, pmspaId))) {
      return result(row, "failed", CANT_LINK);
    }
    if (direction) await this.overwrite(run, type, pm4Id, pmspaId, direction);
    else if (row.linkedId) {
      return result(row, "skipped", "Link only: both kept as they are");
    }
    await this.saveLink(run, type, pm4Id, pmspaId, "linked");
    const out = row.linkedId
      ? result(row, "updated", direction && OVERWRITTEN[direction])
      : result(row, "linked", direction && OVERWRITTEN[direction]);
    const title =
      run.from === "pm4"
        ? (await this.readPm4(run, type, pm4Id))?.title
        : (await this.readRemote(run, type, pmspaId))?.title;
    return title && title !== row.title ? { ...out, newTitle: title } : out;
  }

  private async readPm4(run: Run, type: PairType, id: string) {
    return type === "project"
      ? this.sync.pm4Project(run.userId, id)
      : this.sync.pm4Task(run.userId, id);
  }

  private async readRemote(
    run: Run,
    type: PairType,
    id: string
  ): Promise<RemoteProject | RemoteTask | null> {
    return type === "project"
      ? this.remote.getProject(run.userId, id)
      : this.remote.getTask(run.userId, id);
  }

  /** Writes one side of a linked pair from the other. */
  private async overwrite(
    run: Run,
    type: PairType,
    pm4Id: string,
    pmspaId: string,
    direction: SyncDirection
  ): Promise<void> {
    const { userId, snapshot } = run;
    if (type === "project") {
      const pm4 = await this.sync.pm4Project(userId, pm4Id);
      const remote = await this.remote.getProject(userId, pmspaId);
      if (!pm4 || !remote) throw new RowFailure(CANT_LINK);
      if (direction === "to-pmspa") {
        await this.remote.updateProject(userId, pmspaId, toPmspaProject(pm4));
      } else {
        await this.projectsService.update(
          userId,
          pm4Id,
          toPm4Project(remote, pm4)
        );
      }
      return;
    }
    const pm4 = await this.sync.pm4Task(userId, pm4Id);
    const remote = await this.remote.getTask(userId, pmspaId);
    if (!pm4 || !remote) throw new RowFailure(CANT_LINK);
    if (direction === "to-pmspa") {
      const project = run.links.pmspaOf("project", pm4.projectId);
      await this.remote.updateTask(userId, pmspaId, {
        ...toPmspaTask(pm4),
        ...(project ? { project } : {})
      });
    } else {
      const projectId = run.links.pm4Of("project", remote.projectId);
      if (!projectId) throw new RowFailure(NO_PM4_PROJECT);
      await this.tasksService.update(
        userId,
        pm4Id,
        toPm4Task(remote, pm4, projectId, snapshot.timeZone)
      );
    }
  }

  /** Creates the record's counterpart on the other side, and the link. */
  private async createPair(
    run: Run,
    row: SyncPreviewItemDto,
    type: PairType,
    id: string
  ): Promise<SyncResultItemDto> {
    const { userId, snapshot } = run;
    if (run.from === "pm4") {
      if (type === "project") {
        const pm4 = await this.sync.pm4Project(userId, id);
        if (!pm4) throw new RowFailure(CANT_LINK);
        const created = await this.remote.createProject(
          userId,
          toPmspaProject(pm4)
        );
        await this.saveLink(run, type, id, created.id, "pushed", created);
      } else {
        const pm4 = await this.sync.pm4Task(userId, id);
        if (!pm4) throw new RowFailure(CANT_LINK);
        const project = run.links.pmspaOf("project", pm4.projectId);
        if (!project) throw new RowFailure(NO_PMSPA_PROJECT);
        const created = await this.remote.createTask(userId, {
          ...toPmspaTask(pm4),
          project
        });
        await this.saveLink(run, type, id, created.id, "pushed", created);
      }
      return result(row, "created", null);
    }
    if (type === "project") {
      const remote = snapshot.remoteProjects.find((p) => p.id === id);
      if (!remote) throw new RowFailure(CANT_LINK);
      const created = await this.projectsService.create(
        userId,
        toPm4Project(remote, null)
      );
      await this.saveLink(run, type, created.id, id, "imported");
    } else {
      const remote = snapshot.remoteTasks.find((t) => t.id === id);
      if (!remote) throw new RowFailure(CANT_LINK);
      const projectId = run.links.pm4Of("project", remote.projectId);
      if (!projectId) throw new RowFailure(NO_PM4_PROJECT);
      const created = await this.tasksService.create(
        userId,
        toPm4Task(remote, null, projectId, snapshot.timeZone)
      );
      await this.saveLink(run, type, created.id, id, "imported");
    }
    return result(row, "created", null);
  }

  /** Re-reads both sides (unless given) and saves the link with their fingerprints. */
  private async saveLink(
    run: Run,
    type: PairType,
    pm4Id: string,
    pmspaId: string,
    origin: "pushed" | "imported" | "linked",
    remoteKnown?: RemoteProject | RemoteTask
  ): Promise<void> {
    const pm4 = await this.readPm4(run, type, pm4Id);
    const remote = remoteKnown ?? (await this.readRemote(run, type, pmspaId));
    if (!pm4 || !remote) throw new RowFailure(CANT_LINK);
    const tz = run.snapshot.timeZone;
    const [pm4Hash, pmspaHash] =
      type === "project"
        ? [
            fingerprint(projectTuple(pm4)),
            fingerprint(projectTuple(remote as RemoteProject))
          ]
        : [
            fingerprint(taskTuple(pm4 as Pm4Task, tz)),
            fingerprint(taskTuple(remote as RemoteTask, tz))
          ];
    await this.links.save(run.userId, {
      type,
      pm4Id,
      pmspaId,
      pmspaUserId: run.pmspaUserId,
      origin,
      syncedAt: run.now,
      pm4Hash,
      pmspaHash
    });
    run.links.set(type, pm4Id, pmspaId);
  }
}
