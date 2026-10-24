"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { applyFieldErrors } from "@/lib/api/problem";
import { useUpdateNote, type Note } from "../api";
import {
  NO_LINK,
  NOTE_FIELD_MAP,
  NOTE_TITLE_MAX,
  noteFormDefaults,
  noteFormSchema,
  toNoteInput,
  type NoteFormValues
} from "../schemas";
import { MarkdownEditor } from "./markdown-editor";

/**
 * A note's title and body edited in place (the link stays; it changes in the Edit dialog). `focus` is the field that
 * was clicked. Explicit Save (or Ctrl/⌘+Enter); Cancel (or Esc) drops the changes.
 */
export function NoteInlineForm({
  note,
  focus,
  onDone
}: {
  note: Note;
  focus: "title" | "body";
  onDone: () => void;
}) {
  const update = useUpdateNote(note.id);
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty }
  } = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: noteFormDefaults(note, NO_LINK)
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!isDirty) return onDone();
    try {
      await update.mutateAsync(toNoteInput(values, false));
      toast.success("Note saved");
      onDone();
    } catch (error) {
      if (applyFieldErrors(error, setError, NOTE_FIELD_MAP)) return;
      toast.error("Couldn't save the note.");
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="grid gap-3"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onDone();
        } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          void onSubmit();
        }
      }}
    >
      <FieldGroup className="gap-3">
        <Field data-invalid={!!errors.title}>
          <Input
            aria-label="Title"
            placeholder="Title (optional)"
            maxLength={NOTE_TITLE_MAX}
            autoComplete="off"
            autoFocus={focus === "title"}
            {...register("title")}
            aria-invalid={!!errors.title || undefined}
            className="h-9 text-base font-semibold md:text-base"
          />
          <FieldError errors={[errors.title]} />
        </Field>
        <Field data-invalid={!!errors.body}>
          <Controller
            control={control}
            name="body"
            render={({ field }) => (
              <MarkdownEditor
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={!!errors.body}
                autoFocus={focus === "body"}
              />
            )}
          />
          <FieldError errors={[errors.body]} />
        </Field>
      </FieldGroup>
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer"
          onClick={onDone}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={update.isPending}
          className="cursor-pointer"
        >
          {update.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
