import {
  clearWarnings,
  COLUMN,
  fingerprint,
  projectDiff,
  projectTuple,
  taskDiff,
  taskTuple,
  type Pm4Project,
  type Pm4Task,
  type RemoteProject,
  type RemoteTask,
  type SyncFieldDiff
} from "./pmspa-fields.js";
import type {
  PmspaImportSelectionDto,
  PmspaSyncTargetDto,
  SyncCandidateDto,
  SyncChoiceDto,
  SyncPreviewItemDto
} from "./dto/sync.dto.js";
import type { LinkRow } from "./pmspa-links.repository.js";

// The preview rows of an import and a sync (feat-int-sync-api T3): a pure port of the prototype's
// `importPreview` / `pushPreview` (web/proto/mock/pmspa.ts) over a snapshot. No I/O.

export type SyncDirection = "to-pm4" | "to-pmspa";
export type SyncAction = "create" | "update" | "skip" | "differs";

export interface SyncSnapshot {
  timeZone: string;
  pm4Projects: Pm4Project[];
  pm4Tasks: Pm4Task[];
  remoteProjects: RemoteProject[];
  remoteTasks: RemoteTask[];
  links: LinkRow[];
}

type Item = SyncPreviewItemDto;
type Mode = "import" | "sync";

function row(
  partial: Partial<Item> & Pick<Item, "key" | "type" | "title" | "action">
): Item {
  return {
    parentKey: null,
    linkedId: null,
    detail: null,
    direction: null,
    reason: null,
    parent: false,
    optional: false,
    candidates: [],
    differences: [],
    warnings: [],
    ...partial
  };
}

/** Not linked: create on the other side (an import in PM4, a sync in PMSPA). */
const createAction = (
  mode: Mode
): Pick<Item, "action" | "direction" | "reason" | "differences"> => ({
  action: "create",
  direction: mode === "import" ? "to-pm4" : "to-pmspa",
  reason: null,
  differences: []
});

/** OQ-173: a linked pair's action: up to date, or `differs` with the side that changed as the suggestion. */
function pairAction(
  pm4Changed: boolean,
  pmspaChanged: boolean,
  differences: SyncFieldDiff[]
): Pick<Item, "action" | "direction" | "reason" | "differences"> {
  if (differences.length === 0)
    return {
      action: "skip",
      direction: null,
      reason: "Same in PM4 and PMSPA",
      differences
    };
  const [direction, reason]: [SyncDirection | null, string] =
    pm4Changed && pmspaChanged
      ? [null, "Changed on both sides since the last sync"]
      : pm4Changed
        ? ["to-pmspa", "Changed in PM4 since the last sync"]
        : pmspaChanged
          ? ["to-pm4", "Changed in PMSPA since the last sync"]
          : [null, "Different since they were linked"];
  return { action: "differs", direction, reason, differences };
}

const leadDetail = (name: string | null | undefined) =>
  name ? `Lead ${name}` : null;

const sortByMatch = (items: SyncCandidateDto[], title: string) =>
  [...items].sort(
    (a, b) =>
      Number(b.title.toLowerCase() === title.toLowerCase()) -
        Number(a.title.toLowerCase() === title.toLowerCase()) ||
      a.title.localeCompare(b.title)
  );

const lengthWarnings = (p: Pm4Project): string[] => {
  const warnings: string[] = [];
  if (p.title.length > 150)
    warnings.push("Title over 150 characters: cut to 149 + “…”.");
  if ((p.description ?? "").length > 350)
    warnings.push("Description over 350 characters: cut to 349 + “…”.");
  return warnings;
};

/** The snapshot's links whose PM4 and PMSPA records are both in the snapshot; any other counts as no link. */
export function usableLinks(s: SyncSnapshot): LinkRow[] {
  return s.links.filter((l) =>
    l.type === "project"
      ? s.pm4Projects.some((p) => p.id === l.pm4Id) &&
        s.remoteProjects.some((r) => r.id === l.pmspaId)
      : s.pm4Tasks.some((t) => t.id === l.pm4Id) &&
        s.remoteTasks.some((r) => r.id === l.pmspaId)
  );
}

/** Indexes of the snapshot's links, by the PM4 id and by the PMSPA id. */
function indexLinks(s: SyncSnapshot) {
  const index = (type: "project" | "task") => {
    const byPm4 = new Map<string, LinkRow>();
    const byPmspa = new Map<string, LinkRow>();
    for (const l of s.links) {
      if (l.type !== type) continue;
      byPm4.set(l.pm4Id, l);
      byPmspa.set(l.pmspaId, l);
    }
    return { byPm4, byPmspa };
  };
  return { project: index("project"), task: index("task") };
}

const pm4Candidates = {
  project: (s: SyncSnapshot, r: RemoteProject, linked: Set<string>) =>
    sortByMatch(
      s.pm4Projects
        .filter((p) => !linked.has(p.id))
        .map((p) => ({
          id: p.id,
          title: p.title,
          groupId: null,
          detail: leadDetail(p.leadName),
          differences: projectDiff(p, r)
        })),
      r.title
    ),
  task: (s: SyncSnapshot, r: RemoteTask, linked: Set<string>) =>
    sortByMatch(
      s.pm4Tasks
        .filter((t) => !linked.has(t.id))
        .map((t) => ({
          id: t.id,
          title: t.title,
          groupId: t.projectId,
          detail: COLUMN[t.status],
          differences: taskDiff(t, r, s.timeZone)
        })),
      r.title
    )
};

const pmspaCandidates = {
  project: (s: SyncSnapshot, p: Pm4Project, linked: Set<string>) =>
    sortByMatch(
      s.remoteProjects
        .filter((r) => !linked.has(r.id))
        .map((r) => ({
          id: r.id,
          title: r.title,
          groupId: null,
          detail: leadDetail(r.pl),
          differences: projectDiff(p, r)
        })),
      p.title
    ),
  task: (s: SyncSnapshot, t: Pm4Task, linked: Set<string>) =>
    sortByMatch(
      s.remoteTasks
        .filter(
          (r) =>
            !linked.has(r.id) &&
            s.remoteProjects.some((p) => p.id === r.projectId)
        )
        .map((r) => ({
          id: r.id,
          title: r.title,
          groupId: r.projectId,
          detail: r.column,
          differences: taskDiff(t, r, s.timeZone)
        })),
      t.title
    )
};

/** The rows of an import preview: the selected PMSPA projects and tasks, with the parents they need. */
export function importRows(
  s: SyncSnapshot,
  sel: PmspaImportSelectionDto
): SyncPreviewItemDto[] {
  const links = indexLinks(s);
  const linkedPm4 = {
    project: new Set(links.project.byPm4.keys()),
    task: new Set(links.task.byPm4.keys())
  };
  const items: Item[] = [];
  const keys = new Set<string>();

  /** A link counts only when its PM4 record is in the snapshot. */
  const pairOf = <T extends Pm4Project>(
    type: "project" | "task",
    pmspaId: string,
    list: T[]
  ): { link: LinkRow; pm4: T } | null => {
    const link = links[type].byPmspa.get(pmspaId);
    const pm4 = link && list.find((x) => x.id === link.pm4Id);
    return link && pm4 ? { link, pm4 } : null;
  };

  const addProject = (p: RemoteProject, parentOf?: string): string => {
    const key = `project:${p.id}`;
    if (keys.has(key)) return key;
    keys.add(key);
    const pair = pairOf("project", p.id, s.pm4Projects);
    const { reason, ...action } = pair
      ? pairAction(
          !fingerprint(projectTuple(pair.pm4)).equals(pair.link.pm4Hash),
          !fingerprint(projectTuple(p)).equals(pair.link.pmspaHash),
          projectDiff(pair.pm4, p)
        )
      : createAction("import");
    items.push(
      row({
        key,
        type: "project",
        title: p.title,
        detail: pair ? `Linked to ${pair.pm4.title}` : leadDetail(p.pl),
        ...action,
        reason: parentOf ?? reason,
        parent: Boolean(parentOf),
        linkedId: pair?.pm4.id ?? null,
        candidates: pair ? [] : pm4Candidates.project(s, p, linkedPm4.project),
        warnings: p.done
          ? [
              "Done in PMSPA: PM4 projects have no status, so this isn't imported."
            ]
          : []
      })
    );
    return key;
  };

  const addTask = (t: RemoteTask): string | null => {
    const key = `task:${t.id}`;
    if (keys.has(key)) return key;
    const project = s.remoteProjects.find((p) => p.id === t.projectId);
    if (!project) return null;
    const parentKey = addProject(
      project,
      pairOf("project", project.id, s.pm4Projects)
        ? undefined
        : "Parent of the selected tasks"
    );
    keys.add(key);
    const pair = pairOf("task", t.id, s.pm4Tasks);
    items.push(
      row({
        key,
        parentKey,
        type: "task",
        title: t.title,
        detail: t.column,
        ...(pair
          ? pairAction(
              !fingerprint(taskTuple(pair.pm4, s.timeZone)).equals(
                pair.link.pm4Hash
              ),
              !fingerprint(taskTuple(t, s.timeZone)).equals(
                pair.link.pmspaHash
              ),
              taskDiff(pair.pm4, t, s.timeZone)
            )
          : createAction("import")),
        linkedId: pair?.pm4.id ?? null,
        candidates: pair ? [] : pm4Candidates.task(s, t, linkedPm4.task)
      })
    );
    return key;
  };

  for (const sp of sel.projects) {
    const p = s.remoteProjects.find((x) => x.id === sp.id);
    if (!p) continue;
    addProject(p);
    const ids =
      sp.taskIds ??
      s.remoteTasks.filter((t) => t.projectId === p.id).map((t) => t.id);
    for (const id of ids) {
      const t = s.remoteTasks.find((x) => x.id === id);
      if (t) addTask(t);
    }
  }
  return items;
}

/** The rows of a sync preview of a PM4 project (with its tasks) or task (with its project). Null: not in the snapshot. */
export function syncRows(
  s: SyncSnapshot,
  target: PmspaSyncTargetDto
): SyncPreviewItemDto[] | null {
  const links = indexLinks(s);
  const linkedPmspa = {
    project: new Set(links.project.byPmspa.keys()),
    task: new Set(links.task.byPmspa.keys())
  };
  const items: Item[] = [];
  const keys = new Set<string>();

  const projectRow = (p: Pm4Project, parentOf?: string): string => {
    const key = `project:${p.id}`;
    if (keys.has(key)) return key;
    keys.add(key);
    const link = links.project.byPm4.get(p.id);
    const remote = link && s.remoteProjects.find((x) => x.id === link.pmspaId);
    const pair = link && remote ? { link, remote } : null;
    const base: Pick<Item, "action" | "direction" | "reason" | "differences"> =
      pair
        ? pairAction(
            !fingerprint(projectTuple(p)).equals(pair.link.pm4Hash),
            !fingerprint(projectTuple(pair.remote)).equals(pair.link.pmspaHash),
            projectDiff(p, pair.remote)
          )
        : createAction("sync");
    items.push(
      row({
        key,
        type: "project",
        title: p.title,
        detail: leadDetail(p.leadName),
        ...base,
        ...(parentOf && !pair ? { reason: parentOf, parent: true } : {}),
        linkedId: pair?.remote.id ?? null,
        candidates: pair
          ? []
          : pmspaCandidates.project(s, p, linkedPmspa.project),
        warnings: [
          ...lengthWarnings(p),
          ...(base.action === "differs" ? clearWarnings(base.differences) : [])
        ]
      })
    );
    return key;
  };

  const taskRow = (t: Pm4Task, optional: boolean): string => {
    const key = `task:${t.id}`;
    if (keys.has(key)) return key;
    const project = s.pm4Projects.find((p) => p.id === t.projectId);
    const parentKey = project
      ? projectRow(
          project,
          links.project.byPm4.get(project.id) &&
            s.remoteProjects.some(
              (r) => r.id === links.project.byPm4.get(project.id)!.pmspaId
            )
            ? undefined
            : "Parent of the pushed task"
        )
      : null;
    keys.add(key);
    const link = links.task.byPm4.get(t.id);
    const remote = link && s.remoteTasks.find((x) => x.id === link.pmspaId);
    const pair = link && remote ? { link, remote } : null;
    const base: Pick<Item, "action" | "direction" | "reason" | "differences"> =
      pair
        ? pairAction(
            !fingerprint(taskTuple(t, s.timeZone)).equals(pair.link.pm4Hash),
            !fingerprint(taskTuple(pair.remote, s.timeZone)).equals(
              pair.link.pmspaHash
            ),
            taskDiff(t, pair.remote, s.timeZone)
          )
        : createAction("sync");
    items.push(
      row({
        key,
        parentKey,
        type: "task",
        title: t.title,
        detail: COLUMN[t.status],
        ...base,
        optional,
        linkedId: pair?.remote.id ?? null,
        candidates: pair ? [] : pmspaCandidates.task(s, t, linkedPmspa.task),
        warnings: [
          ...lengthWarnings(t),
          ...(base.action === "differs" ? clearWarnings(base.differences) : [])
        ]
      })
    );
    return key;
  };

  if (target.type === "project") {
    const p = s.pm4Projects.find((x) => x.id === target.id);
    if (!p) return null;
    projectRow(p);
    for (const t of s.pm4Tasks.filter((x) => x.projectId === p.id))
      taskRow(t, true);
    return items;
  }
  const t = s.pm4Tasks.find((x) => x.id === target.id);
  if (!t) return null;
  taskRow(t, false);
  return items;
}

/** The user's choice for a row; a `differs` row with a linked counterpart defaults to its suggested direction, anything else to `create`. */
export function choiceFor(
  choices: SyncChoiceDto[],
  item: SyncPreviewItemDto
): SyncChoiceDto {
  return (
    choices.find((c) => c.key === item.key) ??
    (item.action === "differs" && item.linkedId
      ? {
          key: item.key,
          kind: "link",
          id: item.linkedId,
          overwrite: item.direction
        }
      : { key: item.key, kind: "create" })
  );
}
