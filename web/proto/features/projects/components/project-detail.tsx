"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryState } from "nuqs";
import { ArrowLeft, ExternalLink, FolderX, Pencil, Trash2 } from "lucide-react";
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
import { DeleteProjectDialog } from "@/proto/features/projects/components/delete-project-dialog";
import { ProjectFormDialog } from "@/proto/features/projects/components/project-form-dialog";
import { ProjectIcon } from "@/proto/features/projects/components/project-icon";
import { ProjectLeadLabel } from "@/proto/features/users/components/project-lead-label";
import { ProjectTaskStats } from "@/proto/features/projects/components/project-task-stats";
import { PushToPmspaButton } from "@/proto/features/integrations/components/push-button";
import { PmspaCreatedStamp } from "@/proto/features/integrations/components/pmspa-created-stamp";
import { SyncFlag } from "@/proto/features/integrations/components/sync-flag";
import { LoggedTimeSection } from "@/proto/features/time/components/logged-time-section";
import { TasksList } from "@/proto/features/tasks/components/tasks-list";
import { useProject, type Project } from "@/proto/features/projects/api";
import { useMe } from "@/proto/features/users/api";
import { formatDateTime } from "@/lib/time";
import { isApiError } from "@/lib/api/problem";
import { routes } from "@/proto/lib/routes";

function BackToProjects() {
  return (
    <Button
      variant="outline"
      render={<Link href={routes.app.projects} />}
      className="cursor-pointer"
    >
      Back to projects
    </Button>
  );
}

/** SCR-021: the project page (`?id=`). */
export function ProjectDetail() {
  const [idParam] = useQueryState("id");
  const id = idParam ?? "";
  const [leaving, setLeaving] = useState(false);
  const query = useProject(id, !leaving);
  const project = query.data;
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
            <FolderX />
          </EmptyMedia>
          <EmptyTitle>Project not found</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <BackToProjects />
        </EmptyContent>
      </Empty>
    );
  } else if (!project) {
    body = (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Couldn&apos;t load the project.</EmptyTitle>
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
      <ProjectView
        project={project}
        onEdit={() => setEditing(true)}
        onDelete={() => setDeleting(true)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {body}
      {project ? (
        <>
          <ProjectFormDialog
            open={editing}
            onOpenChange={setEditing}
            project={project}
          />
          <DeleteProjectDialog
            project={project}
            open={deleting}
            onOpenChange={setDeleting}
            onDeleted={() => setLeaving(true)}
          />
        </>
      ) : null}
    </div>
  );
}

function ProjectView({
  project,
  onEdit,
  onDelete
}: {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { data: me } = useMe();
  return (
    <>
      <div className="flex flex-col gap-2">
        <Link
          href={routes.app.projects}
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Projects
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <ProjectIcon project={project} className="size-10" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="min-w-0 text-2xl font-semibold break-words">
                  {project.title}
                </h1>
                <SyncFlag type="project" id={project.id} />
              </div>
              <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                <DateStamp
                  label="Created"
                  value={project.createdAt}
                  timeZone={me?.timeZone}
                />
                <DateStamp
                  label="Last modified"
                  value={project.updatedAt}
                  timeZone={me?.timeZone}
                />
                <PmspaCreatedStamp
                  type="project"
                  id={project.id}
                  timeZone={me?.timeZone}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <PushToPmspaButton
              target={{ type: "project", id: project.id }}
              label={`“${project.title}”`}
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            <DetailRow label="Description">
              {project.description ? (
                <p className="whitespace-pre-line">{project.description}</p>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </DetailRow>
            <DetailRow label="External link">
              {project.externalLink ? (
                <a
                  href={project.externalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full items-center gap-1 break-all text-primary hover:underline"
                >
                  {project.externalLink}
                  <ExternalLink className="size-3.5 shrink-0" />
                </a>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </DetailRow>
            <DetailRow label="Project lead">
              <ProjectLeadLabel lead={project.projectLead} />
            </DetailRow>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          <ProjectTaskStats counts={project.taskCounts} />
        </div>
      </div>

      <LoggedTimeSection projectId={project.id} />

      <TasksList project={{ id: project.id, title: project.title }} />
    </>
  );
}

function DateStamp({
  label,
  value,
  timeZone
}: {
  label: string;
  value: string;
  timeZone: string | undefined;
}) {
  return (
    <span>
      <span>{label}</span> {timeZone ? formatDateTime(value, timeZone) : "—"}
    </span>
  );
}

function DetailRow({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    </div>
  );
}
