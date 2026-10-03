import type { TaskStatus } from "@/features/tasks/status";
import type { components } from "@/lib/api/schema";

export type TaskCounts = components["schemas"]["TaskCountsDto"];

/** 0 when total is 0; else Math.round(completed / total * 100) (OQ-085). */
export function completionPercent(counts: TaskCounts): number {
  void counts;
  throw new Error("not implemented (feat-prj-web)");
}

/** The count for a UI status ("in-progress" → counts.inProgress) (D14). */
export function taskCount(counts: TaskCounts, status: TaskStatus): number {
  void counts;
  void status;
  throw new Error("not implemented (feat-prj-web)");
}
