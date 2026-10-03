import type { TaskStatus } from "@/features/tasks/status";
import type { components } from "@/lib/api/schema";

export type TaskCounts = components["schemas"]["TaskCountsDto"];

/** 0 when total is 0; else Math.round(completed / total * 100) (OQ-085). */
export function completionPercent(counts: TaskCounts): number {
  if (counts.total === 0) return 0;
  return Math.round((counts.completed / counts.total) * 100);
}

const COUNT_FIELDS: Record<TaskStatus, keyof Omit<TaskCounts, "total">> = {
  upcoming: "upcoming",
  "in-progress": "inProgress",
  completed: "completed"
};

/** The count for a UI status ("in-progress" → counts.inProgress) (D14). */
export function taskCount(counts: TaskCounts, status: TaskStatus): number {
  return counts[COUNT_FIELDS[status]];
}
