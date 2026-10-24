"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Pencil, SearchX, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectIcon } from "@/proto/features/projects/components/project-icon";
import { useMe } from "@/proto/features/users/api";
import { ProjectLeadLabel } from "@/proto/features/users/components/project-lead-label";
import { PushToPmspaButton } from "@/proto/features/integrations/components/push-button";
import { PmspaCreatedStamp } from "@/proto/features/integrations/components/pmspa-created-stamp";
import { SyncFlag } from "@/proto/features/integrations/components/sync-flag";
import { DeleteTaskDialog } from "@/proto/features/tasks/components/delete-task-dialog";
import { DueDateBadge } from "@/proto/features/tasks/components/due-date-badge";
import { TaskFormDialog } from "@/proto/features/tasks/components/task-form-dialog";
import { TaskStatusSelect } from "@/proto/features/tasks/components/task-status-select";
import { useTask, type Task } from "@/proto/features/tasks/api";
import { NotesSection } from "@/proto/features/notes/components/notes-section";
import { LoggedTimeSection } from "@/proto/features/time/components/logged-time-section";
import { formatDateTime } from "@/lib/time";
import { isApiError } from "@/lib/api/problem";
import { routes } from "@/proto/lib/routes";

function BackToTasks() {
  return (
    <Button
      variant="outline"
      render={<Link href={routes.app.tasks} />}
      className="cursor-pointer"
    >
      Back to tasks
    </Button>
  );
}

/** SCR-031: the task page (`?id=`). */
export function TaskDetail() {
  const router = useRouter();
  const [idParam] = useQueryState("id");
  const id = idParam ?? "";
  const [leaving, setLeaving] = useState(false);
  const query = useTask(id, !leaving);
  const task = query.data;
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (leaving) return null;

  let body: React.ReactNode;
  const error = query.error;
  if (query.isPending) {
    body = <DetailSkeleton />;
  } else if (isApiError(error, 404)) {
    body = (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchX />
          </EmptyMedia>
          <EmptyTitle>Task not found</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <BackToTasks />
        </EmptyContent>
      </Empty>
    );
  } else if (!task) {
    body = (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Couldn&apos;t load the task.</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button
            variant="outline"
            onClick={() => void query.refetch()}
            className="cursor-pointer"
          >
            Retry
          </Button>
        </EmptyContent>
      </Empty>
    );
  } else {
    body = (
      <TaskView
        task={task}
        onEdit={() => setEditing(true)}
        onDelete={() => setDeleting(true)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {body}
      {task ? (
        <>
          <TaskFormDialog
            open={editing}
            onOpenChange={setEditing}
            task={task}
          />
          <DeleteTaskDialog
            task={task}
            open={deleting}
            onOpenChange={setDeleting}
            onDeleted={() => {
              setLeaving(true);
              router.push(`${routes.app.project}?id=${task.project.id}`);
              toast("Task deleted");
            }}
          />
        </>
      ) : null}
    </div>
  );
}

function TaskView({
  task,
  onEdit,
  onDelete
}: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { data: me } = useMe();
  return (
    <>
      <div className="flex flex-col gap-2">
        <Link
          href={routes.app.tasks}
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Tasks
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="min-w-0 text-2xl font-semibold break-words">
                {task.title}
              </h1>
              <SyncFlag type="task" id={task.id} />
            </div>
            <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              <span>
                Created {me ? formatDateTime(task.createdAt, me.timeZone) : "—"}
              </span>
              <span>
                Last modified{" "}
                {me ? formatDateTime(task.updatedAt, me.timeZone) : "—"}
              </span>
              <PmspaCreatedStamp
                type="task"
                id={task.id}
                timeZone={me?.timeZone}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TaskStatusSelect task={task} className="h-8! w-36" />
            <PushToPmspaButton
              target={{ type: "task", id: task.id }}
              label={`“${task.title}”`}
            />
            <Button
              variant="outline"
              onClick={onEdit}
              className="cursor-pointer"
            >
              <Pencil data-icon="inline-start" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={onDelete}
              className="cursor-pointer"
            >
              <Trash2 data-icon="inline-start" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <Card className="lg:max-w-3xl">
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <DetailRow label="Project">
            <Link
              href={`${routes.app.project}?id=${task.project.id}`}
              className="inline-flex max-w-full items-center gap-2 hover:text-primary hover:underline"
            >
              <ProjectIcon project={task.project} className="size-5" />
              <span className="truncate">{task.project.title}</span>
            </Link>
          </DetailRow>
          <DetailRow label="Due date">
            <DueDateBadge dueDate={task.dueDate} status={task.status} />
          </DetailRow>
          <DetailRow label="Project lead">
            <ProjectLeadLabel lead={task.projectLead} />
          </DetailRow>
          <DetailRow label="External link">
            {task.externalLink ? (
              <a
                href={task.externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-1 break-all text-primary hover:underline"
              >
                {task.externalLink}
                <ExternalLink className="size-3.5 shrink-0" />
              </a>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </DetailRow>
          <DetailRow label="Description" className="sm:col-span-2">
            {task.description ? (
              <p className="whitespace-pre-line">{task.description}</p>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </DetailRow>
        </CardContent>
      </Card>

      <LoggedTimeSection taskId={task.id} />

      <NotesSection
        link={{
          project: { id: task.project.id, title: task.project.title },
          task: {
            id: task.id,
            title: task.title,
            project: { id: task.project.id, title: task.project.title }
          }
        }}
      />
    </>
  );
}

function DetailRow({
  label,
  className,
  children
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-56 w-full lg:max-w-3xl" />
    </div>
  );
}
