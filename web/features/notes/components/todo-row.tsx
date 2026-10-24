"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { formatShortDate } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useUpdateTodo, type Todo } from "../api";
import { DeleteItemDialog } from "./delete-item-dialog";
import { LinkLine } from "./link-line";
import { TodoFormDialog } from "./todo-form-dialog";
import { TodoInlineForm } from "./todo-inline-form";

/**
 * One to-do: a checkbox (ticks it off or reopens it, saved at once), the text (struck through and dimmed when done),
 * its project and task when `showLink` asks, "Done <date>", and a ⋯ menu (Edit, Delete). A click on the text edits
 * it in place (TodoInlineForm); the Edit dialog also changes the link.
 */
export function TodoRow({
  todo,
  timeZone,
  showLink = { project: true, task: true },
  onToggled
}: {
  todo: Todo;
  timeZone: string;
  showLink?: { project: boolean; task: boolean };
  /** Called after a tick-off is saved (the list keeps the row until its filter changes). */
  onToggled?: (todo: Todo, done: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [inline, setInline] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const update = useUpdateTodo();
  // Shows the new state while the save is in flight.
  const done = update.isPending
    ? Boolean(update.variables?.input.done)
    : todo.doneAt !== null;
  const toggle = (next: boolean) => {
    onToggled?.(todo, next);
    update.mutate(
      { id: todo.id, input: { done: next } },
      { onError: () => toast.error("Couldn't save the to-do.") }
    );
  };
  const project = showLink.project ? todo.project : null;
  const task = showLink.task ? todo.task : null;
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Checkbox
        checked={done}
        onCheckedChange={(v) => toggle(v)}
        aria-label={done ? `Reopen “${todo.text}”` : `Mark “${todo.text}” done`}
        className="mt-0.5 cursor-pointer"
      />
      <div className="min-w-0 flex-1 space-y-0.5">
        {inline ? (
          <TodoInlineForm todo={todo} onDone={() => setInline(false)} />
        ) : (
          <p
            role="button"
            tabIndex={0}
            title="Click to edit"
            onClick={() => {
              // Ending a text selection doesn't start editing.
              if (!window.getSelection()?.toString()) setInline(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setInline(true);
              }
            }}
            className={cn(
              "-mx-1.5 cursor-text rounded-sm px-1.5 text-sm break-words whitespace-pre-line hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              done && "text-muted-foreground line-through"
            )}
          >
            {todo.text}
          </p>
        )}
        {!inline && (project || task || todo.doneAt) ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <LinkLine project={project} task={task} />
            {todo.doneAt && done ? (
              <span>Done {formatShortDate(todo.doneAt, timeZone)}</span>
            ) : null}
          </div>
        ) : null}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="To-do actions"
              className="-my-1 -mr-2 shrink-0 cursor-pointer"
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
      <TodoFormDialog open={editing} onOpenChange={setEditing} todo={todo} />
      <DeleteItemDialog
        kind="todo"
        id={todo.id}
        open={deleting}
        onOpenChange={setDeleting}
      />
    </div>
  );
}
