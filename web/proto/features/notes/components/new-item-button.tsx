"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  Clock,
  FolderKanban,
  ListChecks,
  ListTodo,
  NotebookPen,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useProject } from "@/proto/features/projects/api";
import { useTask } from "@/proto/features/tasks/api";
import { ProjectFormDialog } from "@/proto/features/projects/components/project-form-dialog";
import { TaskFormDialog } from "@/proto/features/tasks/components/task-form-dialog";
import { LogFormDialog } from "@/proto/features/time/components/log-form-dialog";
import { useMe } from "@/proto/features/users/api";
import { today } from "@/lib/time";
import { routes } from "@/proto/lib/routes";
import { NO_LINK, type NoteLink } from "../schemas";
import { NoteFormDialog } from "./note-form-dialog";
import { TodoFormDialog } from "./todo-form-dialog";

type NewItem = "project" | "task" | "note" | "todo" | "log";

/**
 * The header's New button: a menu with Project, Task, Note, To-do and Log.
 * On a project's or task's page a new task, note or to-do starts linked to it.
 * Reads `?id=`, so the header renders it inside a Suspense boundary.
 */
export function NewItemButton() {
  const [open, setOpen] = useState<NewItem | null>(null);
  const { data: me } = useMe();
  const pathname = usePathname();
  const id = useSearchParams().get("id") ?? "";
  const onTask = pathname === routes.app.task && id !== "";
  const onProject = pathname === routes.app.project && id !== "";
  const task = useTask(id, onTask);
  const project = useProject(id, onProject);
  const preset: NoteLink =
    onTask && task.data
      ? {
          project: {
            id: task.data.project.id,
            title: task.data.project.title
          },
          task: {
            id: task.data.id,
            title: task.data.title,
            project: {
              id: task.data.project.id,
              title: task.data.project.title
            }
          }
        }
      : onProject && project.data
        ? {
            project: { id: project.data.id, title: project.data.title },
            task: null
          }
        : NO_LINK;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer gap-2"
            />
          }
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">New</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => setOpen("project")}
          >
            <FolderKanban /> Project
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => setOpen("task")}
          >
            <ListTodo /> Task
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => setOpen("note")}
          >
            <NotebookPen /> Note
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => setOpen("todo")}
          >
            <ListChecks /> To-do
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => setOpen("log")}
          >
            <Clock /> Log
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ProjectFormDialog
        open={open === "project"}
        onOpenChange={(o) => setOpen(o ? "project" : null)}
      />
      <TaskFormDialog
        open={open === "task"}
        onOpenChange={(o) => setOpen(o ? "task" : null)}
        defaultProject={preset.project ?? undefined}
      />
      <NoteFormDialog
        open={open === "note"}
        onOpenChange={(o) => setOpen(o ? "note" : null)}
        preset={preset}
      />
      <TodoFormDialog
        open={open === "todo"}
        onOpenChange={(o) => setOpen(o ? "todo" : null)}
        preset={preset}
      />
      <LogFormDialog
        open={open === "log"}
        onOpenChange={(o) => setOpen(o ? "log" : null)}
        defaultDate={today(me?.timeZone ?? "UTC")}
      />
    </>
  );
}
