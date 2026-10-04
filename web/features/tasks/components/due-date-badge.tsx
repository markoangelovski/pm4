"use client";

import { Badge } from "@/components/ui/badge";
import { useMe } from "@/features/users/api";
import type { TaskStatus } from "@/features/tasks/status";
import { dueState } from "@/features/tasks/due";
import { formatWorkDate, today } from "@/lib/time";

/** The due date (or "—"), then an "Overdue" / "Due soon" badge (FR-TSK-008). */
export function DueDateBadge({
  dueDate,
  status
}: {
  dueDate: string | null;
  status: TaskStatus;
}) {
  const { data: me } = useMe();
  if (dueDate === null) return <span className="text-muted-foreground">—</span>;
  const state = me ? dueState(dueDate, status, today(me.timeZone)) : null;
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <span>{formatWorkDate(dueDate)}</span>
      {state === "overdue" ? (
        <Badge variant="destructive">Overdue</Badge>
      ) : state === "due-soon" ? (
        <Badge className="bg-chart-4/12! text-chart-4!">Due soon</Badge>
      ) : null}
    </span>
  );
}
