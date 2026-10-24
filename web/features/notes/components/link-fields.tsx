"use client";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { LogProjectPicker } from "@/features/time/components/log-project-picker";
import { TaskPicker } from "@/features/time/components/task-picker";
import type { NoteLink } from "../schemas";

/**
 * Project and Task, both optional, as in the Log time dialog: a task sets its project and disables the project box.
 * A saved item's deleted project or task shows its name with the deleted marker until another is picked or cleared.
 */
export function LinkFields({
  idPrefix,
  value,
  deleted,
  onChange,
  error
}: {
  idPrefix: string;
  value: NoteLink;
  /** The deleted names to show (null once dropped). */
  deleted: { project: string | null; task: string | null };
  onChange: (next: NoteLink) => void;
  error?: { message?: string };
}) {
  const { project, task } = value;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-project`}>
          Project{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </FieldLabel>
        <LogProjectPicker
          id={`${idPrefix}-project`}
          value={task ? task.project : project}
          deletedTitle={deleted.project}
          disabled={!!task}
          onChange={(p) =>
            onChange({
              project: p,
              task: p && task?.project.id === p.id ? task : null
            })
          }
        />
      </Field>
      <Field data-invalid={!!error}>
        <FieldLabel htmlFor={`${idPrefix}-task`}>
          Task{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </FieldLabel>
        <TaskPicker
          id={`${idPrefix}-task`}
          value={task}
          deletedTitle={deleted.task}
          projectId={project?.id ?? null}
          onChange={(t) =>
            onChange({ project: t ? t.project : project, task: t })
          }
        />
        <FieldError errors={[error]} />
      </Field>
    </div>
  );
}
