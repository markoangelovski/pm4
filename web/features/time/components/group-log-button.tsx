"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LogGroup } from "../day";
import type { LogLink } from "../last-log-link";
import type { TimeLog } from "../types";

/** A log's project, or its task and the task's project; null when that ref is missing or deleted. */
export function logLink(log: TimeLog, by: "project" | "task"): LogLink | null {
  const project = log.project;
  if (!project?.id) return null;
  const projectRef = { id: project.id, title: project.title };
  if (by === "project") return { project: projectRef, task: null };
  const task = log.task;
  return task?.id
    ? {
        project: projectRef,
        task: { id: task.id, title: task.title, project: projectRef }
      }
    : null;
}

/** The + beside a group's name (By Project, By Task, Timeline): a new log preset to its project or task.
 *  It doesn't open or close the group. */
export function GroupLogButton({
  group,
  by,
  onLog
}: {
  group: LogGroup;
  by: "project" | "task";
  onLog: (link: LogLink) => void;
}) {
  if (group.key === "unsorted" || group.key === "nonprod") return null;
  const link = logLink(group.logs[0], by);
  return link ? <LogLinkButton link={link} onLog={onLog} /> : null;
}

/** A + that starts a new log preset to `link` (its task, else its project), without toggling the row it sits in. */
export function LogLinkButton({
  link,
  onLog,
  className
}: {
  link: LogLink;
  onLog: (link: LogLink) => void;
  className?: string;
}) {
  const label = `Log time to ${link.task?.title ?? link.project?.title}`;
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      title={label}
      className={cn(
        "shrink-0 cursor-pointer text-muted-foreground hover:text-foreground",
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        onLog(link);
      }}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Plus />
    </Button>
  );
}
