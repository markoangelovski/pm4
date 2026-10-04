"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { TASK_STATUS_BADGE } from "@/features/projects/components/task-status-badges";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type TaskStatus
} from "@/features/tasks/status";
import { useUpdateTaskStatus, type Task } from "@/features/tasks/api";
import { cn } from "@/lib/utils";

const STATUS_ITEMS = TASK_STATUSES.map((value) => ({
  value,
  label: TASK_STATUS_LABELS[value]
}));

/** FR-TSK-006: the inline status control; a change saves at once. */
export function TaskStatusSelect({
  task,
  className
}: {
  task: Task;
  className?: string;
}) {
  const updateStatus = useUpdateTaskStatus();
  return (
    <Select
      items={STATUS_ITEMS}
      value={task.status}
      onValueChange={(value) => {
        if (value && value !== task.status) {
          updateStatus.mutate({ task, status: value as TaskStatus });
        }
      }}
    >
      <SelectTrigger
        size="sm"
        aria-label={`Status of ${task.title}`}
        className={cn(
          "w-32 cursor-pointer rounded-md! border-transparent font-medium",
          TASK_STATUS_BADGE[task.status],
          className
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_ITEMS.map((item) => (
          <SelectItem
            key={item.value}
            value={item.value}
            className="cursor-pointer"
          >
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
