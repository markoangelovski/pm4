import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "@/features/tasks/status";
import { TASK_STATUS_BADGE } from "@/features/projects/components/task-status-badges";
import {
  completionPercent,
  type TaskCounts
} from "@/features/projects/mock-store";
import { cn } from "@/lib/utils";

/** FR-PRJ-008: counts per status, the total and the completed percentage. */
export function ProjectTaskStats({ counts }: { counts: TaskCounts }) {
  const percent = completionPercent(counts);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Statistics</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TASK_STATUSES.map((status) => (
            <div
              key={status}
              className={cn("rounded-lg p-3", TASK_STATUS_BADGE[status])}
            >
              <p className="text-xs font-medium">
                {TASK_STATUS_LABELS[status]}
              </p>
              <p className="text-2xl font-semibold tabular-nums">
                {counts[status]}
              </p>
            </div>
          ))}
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs font-medium text-muted-foreground">Total</p>
            <p className="text-2xl font-semibold tabular-nums">
              {counts.total}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Completed</span>
            <span className="font-medium tabular-nums">{percent} %</span>
          </div>
          <Progress value={percent} aria-label="Completed" />
        </div>
      </CardContent>
    </Card>
  );
}
