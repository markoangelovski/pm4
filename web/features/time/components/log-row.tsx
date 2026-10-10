"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FolderKanban,
  ListTodo,
  MoreHorizontal,
  Pencil,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/time";
import { routes } from "@/lib/routes";
import type { Ref, TimeLog } from "../types";
import { DeleteLogDialog } from "./delete-log-dialog";
import { LogFormDialog } from "./log-form-dialog";

function RefLink({ ref_, href }: { ref_: Ref; href: string }) {
  if (!ref_.id || ref_.deleted) {
    return (
      <span className="text-muted-foreground">
        {ref_.title} <span className="italic">(deleted)</span>
      </span>
    );
  }
  return (
    <Link
      href={`${href}?id=${ref_.id}`}
      className="hover:underline underline-offset-2"
    >
      {ref_.title}
    </Link>
  );
}

/** SCR-042: one log. `show` (from `rowFields`) hides what the surrounding group already names. */
export function LogRow({
  log,
  color,
  nested,
  show = { title: true, project: true, task: true }
}: {
  log: TimeLog;
  color?: string;
  nested?: boolean;
  show?: { title: boolean; project: boolean; task: boolean };
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const project = show.project ? log.project : null;
  const task = show.task ? log.task : null;
  const title = show.title ? log.title : null;
  return (
    <div
      className={
        "relative flex items-start gap-3 py-3 " +
        (nested
          ? "pr-2 before:absolute before:-left-4 before:top-[1.4rem] before:w-3 before:border-t before:border-border"
          : "px-4")
      }
    >
      {color ? (
        <span
          aria-hidden
          className="mt-1.5 size-2.5 shrink-0 rounded-full"
          style={{ background: color }}
        />
      ) : null}
      <div className="min-w-0 flex-1 space-y-1">
        {title ? <p className="font-semibold leading-snug">{title}</p> : null}
        <p
          className={
            title
              ? "text-sm text-muted-foreground whitespace-pre-line"
              : "whitespace-pre-line"
          }
        >
          {log.text}
        </p>
        {log.excludeFromStats ? (
          <Badge
            variant="outline"
            className="mt-0.5 font-normal text-muted-foreground"
          >
            Excluded from statistics
          </Badge>
        ) : null}
        {project || task ? (
          <p className="flex flex-wrap items-center gap-x-1.5 pt-0.5 text-xs text-muted-foreground">
            {project ? (
              <span className="flex items-center gap-1.5">
                <FolderKanban className="size-3.5 shrink-0" />
                <RefLink ref_={project} href={routes.app.project} />
              </span>
            ) : null}
            {project && task ? <span aria-hidden>·</span> : null}
            {task ? (
              <span className="flex items-center gap-1.5">
                <ListTodo className="size-3.5 shrink-0" />
                <RefLink ref_={task} href={routes.app.task} />
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
      <span className="shrink-0 pt-0.5 text-sm font-medium tabular-nums">
        {formatDuration(log.durationMinutes)}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Log actions"
              className="-mr-2 shrink-0 cursor-pointer"
            />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => setEditing(true)}
          >
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            className="cursor-pointer"
            onClick={() => setDeleting(true)}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <LogFormDialog
        open={editing}
        onOpenChange={setEditing}
        log={log}
        defaultDate={log.workDate}
      />
      <DeleteLogDialog log={log} open={deleting} onOpenChange={setDeleting} />
    </div>
  );
}
