"use client";

import Link from "next/link";
import { ListTodo } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import { SyncFlag } from "@/features/integrations/components/sync-flag";
import { TASK_STATUS_BADGE } from "@/features/projects/components/task-status-badges";
import { useTasks } from "@/features/tasks/api";
import { TASK_STATUS_LABELS, type TaskStatus } from "@/features/tasks/status";
import { useMe } from "@/features/users/api";
import { ProjectLeadLabel } from "@/features/users/components/project-lead-label";
import { LoggedTotal } from "@/features/time/components/logged-total";
import { formatShortDate } from "@/lib/time";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";

const TASKS_SHOWN = 25;
/** The open statuses: completed tasks stay on the project page. */
const OPEN_STATUSES: TaskStatus[] = ["upcoming", "in-progress"];
/** The projects table's column count. */
const COLUMNS = 7;

/**
 * An expanded project's tasks, as rows under the project in the projects table (SCR-020): its 25 most recently
 * updated open (upcoming and in progress) tasks, then "Show all N open tasks" when there are more. The rows are
 * indented so the task icon starts where the project's title does (pl-19!: the cell padding, chevron, icon and
 * gaps). Mounted only while the project is open, so the tasks are read when it first opens.
 */
export function ProjectTaskRows({ projectId }: { projectId: string }) {
  const { data: me } = useMe();
  const query = useTasks({
    projectId,
    statuses: OPEN_STATUSES,
    q: "",
    sort: "updatedAt:desc",
    page: 1,
    pageSize: TASKS_SHOWN
  });

  if (query.isPending) {
    return (
      <TableRow className="bg-muted/30 hover:bg-muted/30">
        <TableCell colSpan={COLUMNS} className="pl-19!">
          <Skeleton className="h-5 w-64" />
        </TableCell>
      </TableRow>
    );
  }
  if (query.isError) {
    return (
      <TableRow className="bg-muted/30 hover:bg-muted/30">
        <TableCell colSpan={COLUMNS} className="pl-19! text-muted-foreground">
          Couldn&apos;t load the tasks.{" "}
          <Button
            variant="link"
            className="h-auto cursor-pointer p-0"
            onClick={() => void query.refetch()}
          >
            Retry
          </Button>
        </TableCell>
      </TableRow>
    );
  }

  const { items, total } = query.data;
  return (
    <>
      {items.map((task) => (
        <TableRow key={task.id} className="bg-muted/30">
          <TableCell className="pl-19!">
            <div className="flex min-w-0 items-center gap-2">
              <ListTodo
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground"
              />
              <Link
                href={`${routes.app.task}?id=${task.id}`}
                className={cn(
                  "min-w-0 truncate hover:text-primary hover:underline",
                  task.status === "completed" &&
                    "text-muted-foreground line-through decoration-muted-foreground/50"
                )}
              >
                {task.title}
              </Link>
              <SyncFlag type="task" id={task.id} />
            </div>
          </TableCell>
          <TableCell className="truncate">
            <ProjectLeadLabel lead={task.projectLead} />
          </TableCell>
          <TableCell>
            <Badge className={TASK_STATUS_BADGE[task.status]}>
              {TASK_STATUS_LABELS[task.status]}
            </Badge>
          </TableCell>
          <TableCell />
          <TableCell className="whitespace-nowrap">
            <LoggedTotal minutes={task.loggedMinutes} />
          </TableCell>
          <TableCell className="whitespace-nowrap">
            {me ? (
              formatShortDate(task.createdAt, me.timeZone)
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </TableCell>
          <TableCell className="whitespace-nowrap pr-4">
            {me ? (
              formatShortDate(task.updatedAt, me.timeZone)
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </TableCell>
        </TableRow>
      ))}
      {total > items.length ? (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={COLUMNS} className="pl-19!">
            <Link
              href={`${routes.app.project}?id=${projectId}&status=${OPEN_STATUSES.join(",")}`}
              className="text-muted-foreground hover:text-primary hover:underline"
            >
              Show all {total} open tasks
            </Link>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}
