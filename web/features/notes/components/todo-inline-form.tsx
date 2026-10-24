"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { applyFieldErrors } from "@/lib/api/problem";
import { useUpdateTodo, type Todo } from "../api";
import {
  NO_LINK,
  TODO_FIELD_MAP,
  TODO_TEXT_MAX,
  todoFormDefaults,
  todoFormSchema,
  toTodoInput,
  type TodoFormValues
} from "../schemas";

/**
 * A to-do's text edited in place (the link stays; it changes in the Edit dialog). Save (or Enter, Ctrl/⌘+Enter);
 * Cancel (or Esc) drops the change.
 */
export function TodoInlineForm({
  todo,
  onDone
}: {
  todo: Todo;
  onDone: () => void;
}) {
  const update = useUpdateTodo();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty }
  } = useForm<TodoFormValues>({
    resolver: zodResolver(todoFormSchema),
    defaultValues: todoFormDefaults(todo, NO_LINK)
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!isDirty) return onDone();
    try {
      await update.mutateAsync({
        id: todo.id,
        input: toTodoInput(values, false)
      });
      toast.success("To-do saved");
      onDone();
    } catch (error) {
      if (applyFieldErrors(error, setError, TODO_FIELD_MAP)) return;
      toast.error("Couldn't save the to-do.");
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="grid gap-2"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onDone();
        } else if (e.key === "Enter") {
          e.preventDefault();
          void onSubmit();
        }
      }}
    >
      <Field data-invalid={!!errors.text}>
        <Input
          aria-label="To-do"
          maxLength={TODO_TEXT_MAX}
          autoComplete="off"
          autoFocus
          {...register("text")}
          aria-invalid={!!errors.text || undefined}
          className="h-8 text-sm"
        />
        <FieldError errors={[errors.text]} />
      </Field>
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
