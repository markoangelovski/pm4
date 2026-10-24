import { z } from "zod";
import type { ProjectRef, TaskRef } from "@/proto/features/time/types";
import type { Note, NoteInput, Todo, TodoInput } from "./api";

/** Character limits (data model). */
export const NOTE_TITLE_MAX = 200;
export const NOTE_BODY_MAX = 10000;
export const TODO_TEXT_MAX = 500;

/** A new item's link, pre-filled from the page it's created on. */
export interface NoteLink {
  project: ProjectRef | null;
  task: TaskRef | null;
}
export const NO_LINK: NoteLink = { project: null, task: null };

const link = {
  project: z.custom<ProjectRef | null>(),
  task: z.custom<TaskRef | null>()
};

/** The link of a saved item, as picker values (a deleted one is none: its name shows separately). */
function linkOf(item: Pick<Note, "project" | "task">): NoteLink {
  const project = item.project?.id
    ? { id: item.project.id, title: item.project.title }
    : null;
  return {
    project,
    task:
      item.task?.id && project
        ? { id: item.task.id, title: item.task.title, project }
        : null
  };
}

const linkInput = (values: NoteLink) =>
  values.task
    ? { taskId: values.task.id }
    : { projectId: values.project?.id ?? null, taskId: null };

export const noteFormSchema = z.object({
  title: z.string().trim().max(NOTE_TITLE_MAX),
  body: z
    .string()
    .trim()
    .min(1, "Write something in the note.")
    .max(NOTE_BODY_MAX, "Keep the note under 10,000 characters."),
  ...link
});
export type NoteFormValues = z.infer<typeof noteFormSchema>;

export function noteFormDefaults(
  note: Note | undefined,
  preset: NoteLink
): NoteFormValues {
  return note
    ? { title: note.title ?? "", body: note.body, ...linkOf(note) }
    : { title: "", body: "", ...preset };
}

/** Sends the link only on create or when it changed (an unchanged deleted link keeps its name). */
export function toNoteInput(
  values: NoteFormValues,
  linkChanged: boolean
): NoteInput {
  return {
    title: values.title.trim() || null,
    body: values.body.trim(),
    ...(linkChanged ? linkInput(values) : {})
  };
}

export const NOTE_FIELD_MAP = {
  title: "title",
  body: "body",
  projectId: "project",
  taskId: "task"
} as const;

export const todoFormSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Describe the to-do.")
    .max(TODO_TEXT_MAX, "Keep the to-do under 500 characters."),
  ...link
});
export type TodoFormValues = z.infer<typeof todoFormSchema>;

export function todoFormDefaults(
  todo: Todo | undefined,
  preset: NoteLink
): TodoFormValues {
  return todo ? { text: todo.text, ...linkOf(todo) } : { text: "", ...preset };
}

export function toTodoInput(
  values: TodoFormValues,
  linkChanged: boolean
): TodoInput {
  return {
    text: values.text.trim(),
    ...(linkChanged ? linkInput(values) : {})
  };
}

export const TODO_FIELD_MAP = {
  text: "text",
  projectId: "project",
  taskId: "task"
} as const;

/** True when the picked link differs from the saved one (or a deleted name was dropped). */
export function linkChanged(
  item: Pick<Note, "project" | "task"> | undefined,
  values: NoteLink,
  droppedDeleted: boolean
): boolean {
  if (!item) return true;
  const hadDeleted = [item.project, item.task].some((r) => r && !r.id);
  return (
    (hadDeleted && droppedDeleted) ||
    (values.project?.id ?? null) !== (item.project?.id ?? null) ||
    (values.task?.id ?? null) !== (item.task?.id ?? null)
  );
}
