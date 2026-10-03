export const TASK_STATUSES = ["upcoming", "in-progress", "completed"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  upcoming: "Upcoming",
  "in-progress": "In progress",
  completed: "Completed"
};
