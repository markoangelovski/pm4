"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, ListChecks, NotebookPen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useProject } from "@/features/projects/api";
import { useTask } from "@/features/tasks/api";
import { routes } from "@/lib/routes";
import { NO_LINK, type NoteLink } from "../schemas";
import { NoteFormDialog } from "./note-form-dialog";
import { TodoFormDialog } from "./todo-form-dialog";

/**
 * The header's New button: a menu with Note and To-do. On a project's or task's page the new item starts linked to it.
 * Reads `?id=`, so the header renders it inside a Suspense boundary.
 */
export function NewItemButton() {
  const [open, setOpen] = useState<"note" | "todo" | null>(null);
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
        </DropdownMenuContent>
      </DropdownMenu>
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
    </>
  );
}
