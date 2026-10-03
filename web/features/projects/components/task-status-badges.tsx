import { Badge } from "@/components/ui/badge";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type TaskStatus
} from "@/features/tasks/status";
import { taskCount, type TaskCounts } from "@/features/projects/stats";
import { cn } from "@/lib/utils";

/** Status colors, in the template's badge style (`bg-chart-N/12 text-chart-N`). */
export const TASK_STATUS_BADGE: Record<TaskStatus, string> = {
  upcoming: "bg-chart-4/12! text-chart-4!",
  "in-progress": "bg-primary/12! text-primary!",
  completed: "bg-chart-2/12! text-chart-2!"
};

/** The three status counts as badges, each with a title naming the status. */
export function TaskStatusBadges({ counts }: { counts: TaskCounts }) {
  return (
    <span className="flex items-center gap-1.5">
      {TASK_STATUSES.map((status) => (
        <Badge
          key={status}
          title={TASK_STATUS_LABELS[status]}
          className={cn("min-w-7 tabular-nums", TASK_STATUS_BADGE[status])}
        >
          {taskCount(counts, status)}
        </Badge>
      ))}
    </span>
  );
}
