"use client";

import { useState, type KeyboardEvent, type MouseEvent } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
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
import { formatShortDate } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Note } from "../api";
import { DeleteItemDialog } from "./delete-item-dialog";
import { LinkLine } from "./link-line";
import { Markdown } from "./markdown";
import { NoteFormDialog } from "./note-form-dialog";
import { NoteInlineForm } from "./note-inline-form";

/** A note longer than this (characters or lines) starts clamped, with Show more. */
const LONG_CHARS = 500;
const LONG_LINES = 10;

/** A click on a link, a control, or one that ends a text selection doesn't start editing. */
function startsEditing(e: MouseEvent): boolean {
  const target = e.target as HTMLElement;
  if (target.closest("a, button, input, label")) return false;
  return !window.getSelection()?.toString();
}

/**
 * One note: the title ("Untitled note" when unset) and a ⋯ menu (Edit, Delete), the creation date and its project and
 * task, the rendered Markdown (a long one clamped, with Show more), "Updated <date>". A click on the title or the body
 * edits both in place (NoteInlineForm); the Edit dialog also changes the link. `hide` leaves out the link a
 * surrounding card already names.
 */
export function NoteItem({
  note,
  timeZone,
  hide
}: {
  note: Note;
  timeZone: string;
  hide?: "project" | "task";
}) {
  const [editing, setEditing] = useState(false);
  const [inline, setInline] = useState<"title" | "body" | null>(null);
  const [deleting, setDeleting] = useState(false);
  const long =
    note.body.length > LONG_CHARS || note.body.split("\n").length > LONG_LINES;
  const [expanded, setExpanded] = useState(false);
  const clamped = long && !expanded;
  // A task's card names the task and its project; a project's card names the project.
  const project = hide ? null : note.project;
  const task = hide === "task" ? null : note.task;
  const editable = (field: "title" | "body") => ({
    role: "button",
    tabIndex: 0,
    title: "Click to edit",
    onClick: (e: MouseEvent) => {
      if (startsEditing(e)) setInline(field);
    },
    onKeyDown: (e: KeyboardEvent) => {
      if (e.target === e.currentTarget && e.key === "Enter") {
        e.preventDefault();
        setInline(field);
      }
    }
  });
  return (
    <article className="flex flex-col gap-3 py-3">
      <header className="flex flex-col gap-1.5">
        <div className="flex items-start gap-2">
          {inline ? (
            <span className="flex-1 text-sm font-medium text-muted-foreground">
              Editing note
            </span>
          ) : (
            <h3
              {...editable("title")}
              className={cn(
                "-mx-1.5 min-w-0 flex-1 cursor-text rounded-sm px-1.5 text-lg font-semibold leading-snug break-words hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                !note.title && "text-muted-foreground italic"
              )}
            >
              {note.title ?? "Untitled note"}
            </h3>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Note actions"
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
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="flex items-center gap-1.5 font-medium">
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
            <time dateTime={note.createdAt}>
              {formatShortDate(note.createdAt, timeZone)}
            </time>
          </span>
          <LinkLine
            project={project}
            task={task}
            className="text-sm font-medium text-foreground [&_svg]:size-4 [&_svg]:text-muted-foreground"
          />
        </div>
      </header>
      {inline ? (
        <div className="border-t pt-3">
          <NoteInlineForm
            note={note}
            focus={inline}
            onDone={() => setInline(null)}
          />
        </div>
      ) : (
        <>
          <div
            {...editable("body")}
            className={cn(
              "relative -mx-1.5 cursor-text rounded-sm border-t px-1.5 pt-3 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              clamped &&
                "max-h-56 overflow-hidden after:absolute after:inset-x-0 after:bottom-0 after:h-12 after:bg-linear-to-t after:from-card after:to-transparent"
            )}
          >
            <Markdown>{note.body}</Markdown>
          </div>
          {long ? (
            <Button
              variant="link"
              size="sm"
              className="h-auto self-start p-0 text-xs cursor-pointer"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? (
                <ChevronUp data-icon="inline-start" />
              ) : (
                <ChevronDown data-icon="inline-start" />
              )}
              {expanded ? "Show less" : "Show more"}
            </Button>
          ) : null}
        </>
      )}
      <span className="text-xs text-muted-foreground">
        Updated {formatShortDate(note.updatedAt, timeZone)}
      </span>
      <NoteFormDialog open={editing} onOpenChange={setEditing} note={note} />
      <DeleteItemDialog
        kind="note"
        id={note.id}
        open={deleting}
        onOpenChange={setDeleting}
      />
    </article>
  );
}
