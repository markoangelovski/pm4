import type { TaskStatus } from "../../database/schema/projects.js";
import type { PmspaProjectWrite, PmspaTaskWrite } from "./pmspa-remote.js";
import {
  COLUMN,
  cut,
  dueAtOf,
  dueDateOf,
  linkVal,
  STATUS,
  val,
  type Pm4Project,
  type Pm4Task,
  type RemoteProject,
  type RemoteTask
} from "./pmspa-fields.js";

// The write mappers in both directions (req-integrations *Entity mapping*): pure, no I/O.
// Port of the prototype's pmspaProjectFields, pm4ProjectFields, pmspaTaskFields, pm4TaskFields (D6…D8, D11).

/** The PMSPA fields a PM4 project or task is built from (`RemoteProject` or `RemoteTask`). */
type ProjectFieldsOf = Pick<
  RemoteProject,
  "title" | "description" | "pl" | "kanboard"
>;

export interface Pm4ProjectWrite {
  title: string;
  description: string | null;
  externalLink: string | null;
  projectLeadName?: string | null;
  projectLeadUserId?: null;
}

export interface Pm4TaskWrite extends Pm4ProjectWrite {
  status: TaskStatus;
  dueDate: string;
  projectId: string;
}

/** PM4 → PMSPA project fields. */
export function toPmspaProject(p: Pm4Project): PmspaProjectWrite {
  return {
    title: cut(p.title, 150),
    description: val(p.description) ? cut(p.description!, 350) : null,
    pl: val(p.leadName),
    kanboard: linkVal(p.externalLink)
  };
}

/** PM4 → PMSPA task fields: the project fields, the column, done and the due date (D7). */
export function toPmspaTask(t: Pm4Task): PmspaTaskWrite {
  return {
    ...toPmspaProject(t),
    column: COLUMN[t.status],
    done: t.status === "completed",
    dueAt: t.dueDate ? dueAtOf(t.dueDate) : null
  };
}

/**
 * PMSPA → PM4 project fields. The lead is left out when it already equals PMSPA's `pl` (D6),
 * so a user lead isn't turned into a text lead.
 */
export function toPm4Project(
  r: ProjectFieldsOf,
  current: Pm4Project | null
): Pm4ProjectWrite {
  const base: Pm4ProjectWrite = {
    title: r.title,
    description: val(r.description),
    externalLink: linkVal(r.kanboard)
  };
  if (current?.leadName === val(r.pl)) return base;
  const name = val(r.pl);
  return {
    ...base,
    projectLeadName: name === null ? null : cut(name, 100),
    projectLeadUserId: null
  };
}

/** PMSPA → PM4 task fields: the project fields, the status, the due date in the user's zone (D7). */
export function toPm4Task(
  r: RemoteTask,
  current: Pm4Task | null,
  pm4ProjectId: string,
  timeZone: string
): Pm4TaskWrite {
  const project = toPm4Project(r, current);
  return {
    ...project,
    status: STATUS[r.column],
    dueDate: dueDateOf(r.dueAt, timeZone),
    projectId: pm4ProjectId
  };
}
