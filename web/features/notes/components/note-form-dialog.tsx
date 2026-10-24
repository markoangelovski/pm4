"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { applyFieldErrors, isApiError } from "@/lib/api/problem";
import { useCreateNote, useUpdateNote, type Note } from "../api";
import {
  linkChanged,
  NO_LINK,
  NOTE_FIELD_MAP,
  NOTE_TITLE_MAX,
  noteFormDefaults,
  noteFormSchema,
  toNoteInput,
  type NoteFormValues,
  type NoteLink
} from "../schemas";
import { LinkFields } from "./link-fields";
import { MarkdownEditor } from "./markdown-editor";

/** New note (no `note`; `preset` pre-fills the link) or Edit note. Mounts its form only while open. */
export function NoteFormDialog({
  open,
  onOpenChange,
  note,
  preset = NO_LINK
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: Note;
  preset?: NoteLink;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-md! sm:max-w-2xl! max-h-[92vh] overflow-y-auto">
        {open ? (
          <NoteForm
            note={note}
            preset={preset}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function NoteForm({
  note,
  preset,
  onDone
}: {
  note?: Note;
  preset: NoteLink;
  onDone: () => void;
}) {
  const create = useCreateNote();
  const update = useUpdateNote(note?.id ?? "");
  const save = note ? update : create;
  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors }
  } = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: noteFormDefaults(note, preset)
  });
  const [project, task] = useWatch({ control, name: ["project", "task"] });
  const [keepDeleted, setKeepDeleted] = useState(true);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await save.mutateAsync(
        toNoteInput(values, linkChanged(note, values, !keepDeleted))
      );
      toast.success(note ? "Note saved" : "Note created");
      onDone();
    } catch (error) {
      if (applyFieldErrors(error, setError, NOTE_FIELD_MAP)) return;
      if (isApiError(error, 404)) {
        setError("task", { message: "This item no longer exists." });
        return;
      }
      toast.error("Couldn't save the note.");
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{note ? "Edit note" : "New note"}</DialogTitle>
        <DialogDescription className="sr-only">
          {note ? "Change this note." : "Write a note."}
        </DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <Field data-invalid={!!errors.title}>
          <FieldLabel htmlFor="note-title">
            Title{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </FieldLabel>
          <Input
            id="note-title"
            maxLength={NOTE_TITLE_MAX}
            autoComplete="off"
            {...register("title")}
            aria-invalid={!!errors.title || undefined}
          />
          <FieldError errors={[errors.title]} />
        </Field>
        <Field data-invalid={!!errors.body}>
          <FieldLabel htmlFor="note-body">Note</FieldLabel>
          <Controller
            control={control}
            name="body"
            render={({ field }) => (
              <MarkdownEditor
                id="note-body"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={!!errors.body}
                autoFocus
              />
            )}
          />
          <FieldError errors={[errors.body]} />
        </Field>
        <LinkFields
          idPrefix="note"
          value={{ project, task }}
          deleted={{
            project:
              keepDeleted && note?.project && !note.project.id
                ? note.project.title
                : null,
            task:
              keepDeleted && note?.task && !note.task.id
                ? note.task.title
                : null
          }}
          onChange={(next) => {
            setKeepDeleted(false);
            setValue("project", next.project);
            setValue("task", next.task);
          }}
          error={errors.task}
        />
      </FieldGroup>
      <DialogFooter className="rounded-b-md">
        <DialogClose
          render={
            <Button
              variant="outline"
              type="button"
              className="cursor-pointer"
            />
          }
        >
          Cancel
        </DialogClose>
        <Button
          type="submit"
          disabled={save.isPending}
          className="cursor-pointer"
        >
          {save.isPending ? "Saving…" : note ? "Save" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}
