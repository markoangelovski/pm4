"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { applyFieldErrors, isApiError } from "@/lib/api/problem";
import { useCreateTodo, useUpdateTodo, type Todo } from "../api";
import {
  linkChanged,
  NO_LINK,
  TODO_FIELD_MAP,
  TODO_TEXT_MAX,
  todoFormDefaults,
  todoFormSchema,
  toTodoInput,
  type NoteLink,
  type TodoFormValues
} from "../schemas";
import { LinkFields } from "./link-fields";

/** New to-do (no `todo`; `preset` pre-fills the link) or Edit to-do. Mounts its form only while open. */
export function TodoFormDialog({
  open,
  onOpenChange,
  todo,
  preset = NO_LINK
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todo?: Todo;
  preset?: NoteLink;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-md! sm:max-w-lg">
        {open ? (
          <TodoForm
            todo={todo}
            preset={preset}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function TodoForm({
  todo,
  preset,
  onDone
}: {
  todo?: Todo;
  preset: NoteLink;
  onDone: () => void;
}) {
  const create = useCreateTodo();
  const update = useUpdateTodo();
  const pending = create.isPending || update.isPending;
  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors }
  } = useForm<TodoFormValues>({
    resolver: zodResolver(todoFormSchema),
    defaultValues: todoFormDefaults(todo, preset)
  });
  const [project, task] = useWatch({ control, name: ["project", "task"] });
  const [keepDeleted, setKeepDeleted] = useState(true);

  const onSubmit = handleSubmit(async (values) => {
    const input = toTodoInput(values, linkChanged(todo, values, !keepDeleted));
    try {
      if (todo) await update.mutateAsync({ id: todo.id, input });
      else await create.mutateAsync(input);
      toast.success(todo ? "To-do saved" : "To-do added");
      onDone();
    } catch (error) {
      if (applyFieldErrors(error, setError, TODO_FIELD_MAP)) return;
      if (isApiError(error, 404)) {
        setError("task", { message: "This item no longer exists." });
        return;
      }
      toast.error("Couldn't save the to-do.");
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{todo ? "Edit to-do" : "New to-do"}</DialogTitle>
        <DialogDescription className="sr-only">
          {todo ? "Change this to-do." : "Add something to do."}
        </DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <Field data-invalid={!!errors.text}>
          <FieldLabel htmlFor="todo-text">To-do</FieldLabel>
          <Textarea
            id="todo-text"
            rows={2}
            autoFocus
            maxLength={TODO_TEXT_MAX}
            placeholder="What needs doing?"
            {...register("text")}
            onKeyDown={(e) => {
              // Enter saves, Shift+Enter is a new line (the text stays short).
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void onSubmit();
              }
            }}
            aria-invalid={!!errors.text || undefined}
          />
          <FieldError errors={[errors.text]} />
        </Field>
        <LinkFields
          idPrefix="todo"
          value={{ project, task }}
          deleted={{
            project:
              keepDeleted && todo?.project && !todo.project.id
                ? todo.project.title
                : null,
            task:
              keepDeleted && todo?.task && !todo.task.id
                ? todo.task.title
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
        <Button type="submit" disabled={pending} className="cursor-pointer">
          {pending ? "Saving…" : todo ? "Save" : "Add"}
        </Button>
      </DialogFooter>
    </form>
  );
}
