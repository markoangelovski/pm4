"use client";

import { Controller, useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "@/features/tasks/status";
import { useMe } from "@/features/users/api";
import { ProjectLeadField } from "@/features/users/components/project-lead-field";
import { DueDateField } from "@/features/tasks/components/due-date-field";
import { ProjectPicker } from "@/features/tasks/components/project-picker";
import type { ProjectRef, Task } from "@/features/tasks/api";
import { useCreateTask, useUpdateTask } from "@/features/tasks/api";
import {
  TASK_FIELD_MAP,
  taskFormDefaults,
  taskFormSchema,
  toTaskInput,
  type TaskFormValues
} from "@/features/tasks/schemas";
import { applyFieldErrors, isApiError } from "@/lib/api/problem";

const STATUS_ITEMS = TASK_STATUSES.map((value) => ({
  value,
  label: TASK_STATUS_LABELS[value]
}));

/** SCR-032: create (no `task`) or edit a task. */
export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  defaultProject
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task;
  /** Pre-selected project when creating from a project's page. */
  defaultProject?: ProjectRef;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-md! sm:max-w-lg">
        {open ? (
          <TaskForm
            task={task}
            defaultProject={defaultProject}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function TaskForm({
  task,
  defaultProject,
  onDone
}: {
  task?: Task;
  defaultProject?: ProjectRef;
  onDone: () => void;
}) {
  const { data: me } = useMe();
  const create = useCreateTask();
  const update = useUpdateTask(task?.id ?? "");
  const pending = create.isPending || update.isPending;
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors }
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: taskFormDefaults(task, me, defaultProject)
  });

  function onFailure(error: unknown) {
    if (isApiError(error, 404)) {
      setError("project", { message: "Choose a project." });
    } else if (!applyFieldErrors(error, setError, TASK_FIELD_MAP)) {
      toast.error("Couldn't save the task.");
    }
  }

  const onSubmit = handleSubmit((values) => {
    const input = toTaskInput(values);
    if (task) {
      update.mutate(input, { onSuccess: onDone, onError: onFailure });
    } else {
      create.mutate(input, {
        onSuccess: () => {
          toast.success("Task created");
          onDone();
        },
        onError: onFailure
      });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
        <DialogDescription className="sr-only">
          {task ? "Change the task's details." : "Create a task."}
        </DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <Field data-invalid={!!errors.project}>
          <FieldLabel htmlFor="task-project">Project</FieldLabel>
          <Controller
            control={control}
            name="project"
            render={({ field, fieldState }) => (
              <ProjectPicker
                id="task-project"
                value={field.value}
                onChange={field.onChange}
                invalid={fieldState.invalid}
              />
            )}
          />
          <FieldError errors={[errors.project]} />
        </Field>
        <Field data-invalid={!!errors.title}>
          <FieldLabel htmlFor="task-title">Title</FieldLabel>
          <Input
            id="task-title"
            autoFocus
            {...register("title")}
            aria-invalid={!!errors.title || undefined}
          />
          <FieldError errors={[errors.title]} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="task-status">Status</FieldLabel>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select
                  items={STATUS_ITEMS}
                  value={field.value}
                  onValueChange={(v) => v && field.onChange(v)}
                >
                  <SelectTrigger
                    id="task-status"
                    className="w-full cursor-pointer rounded-md!"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_ITEMS.map((item) => (
                      <SelectItem
                        key={item.value}
                        value={item.value}
                        className="cursor-pointer"
                      >
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="task-due">Due date</FieldLabel>
            <Controller
              control={control}
              name="dueDate"
              render={({ field }) => (
                <DueDateField
                  id="task-due"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>
        </div>
        <Field data-invalid={!!errors.lead}>
          <FieldLabel htmlFor="task-lead">Project lead</FieldLabel>
          <Controller
            control={control}
            name="lead"
            render={({ field, fieldState }) => (
              <ProjectLeadField
                id="task-lead"
                value={field.value}
                onChange={field.onChange}
                invalid={fieldState.invalid}
                disabled={field.disabled}
              />
            )}
          />
          <FieldError errors={[errors.lead]} />
        </Field>
        <Field data-invalid={!!errors.externalLink}>
          <FieldLabel htmlFor="task-link">External link</FieldLabel>
          <Input
            id="task-link"
            type="url"
            placeholder="https://"
            {...register("externalLink")}
            aria-invalid={!!errors.externalLink || undefined}
          />
          <FieldError errors={[errors.externalLink]} />
        </Field>
        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor="task-description">Description</FieldLabel>
          <Textarea
            id="task-description"
            rows={4}
            {...register("description")}
            aria-invalid={!!errors.description || undefined}
          />
          <FieldError errors={[errors.description]} />
        </Field>
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
          {task
            ? pending
              ? "Saving…"
              : "Save"
            : pending
              ? "Creating…"
              : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}
