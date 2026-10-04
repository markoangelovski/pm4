import { z } from "zod";
import type { ProjectRef, Task, TaskInput } from "@/features/tasks/api";
import { projectFormSchema, PROJECT_FIELD_MAP } from "@/features/projects/schemas";
import { TASK_STATUSES } from "@/features/tasks/status";
import type { Me } from "@/features/users/api";
import { fromProjectLead, leadFromMe, leadToInput } from "@/features/users/lead";

/** SCR-032: create/edit form. Extends project form with project, status, dueDate. */
export const taskFormSchema = projectFormSchema.extend({
  project: z
    .custom<ProjectRef | null>()
    .refine((v) => v !== null, "Choose a project."),
  status: z.enum(TASK_STATUSES),
  dueDate: z.string().nullable()
});

export type TaskFormValues = z.input<typeof taskFormSchema>;

/** Edit: the task's values (project = { id, title } of task.project). Create: project = defaultProject ?? null, status "upcoming", dueDate null, lead = leadFromMe(me). */
export function taskFormDefaults(
  task: Task | undefined,
  me: Me | undefined,
  defaultProject?: ProjectRef
): TaskFormValues {
  if (task) {
    return {
      title: task.title,
      description: task.description ?? "",
      externalLink: task.externalLink ?? "",
      project: task.project,
      lead: fromProjectLead(task.projectLead),
      status: task.status,
      dueDate: task.dueDate
    };
  }
  return {
    title: "",
    description: "",
    externalLink: "",
    project: defaultProject ?? null,
    lead: leadFromMe(me),
    status: "upcoming",
    dueDate: null
  };
}

/** Form values → the API body: "" → null; the lead via leadToInput; project.id → projectId. */
export function toTaskInput(values: TaskFormValues): TaskInput {
  const title = values.title.trim();
  const externalLink = values.externalLink.trim();
  return {
    projectId: values.project!.id,
    title,
    description: values.description.trim() === "" ? null : values.description,
    externalLink: externalLink === "" ? null : externalLink,
    ...leadToInput(values.lead),
    status: values.status,
    dueDate: values.dueDate
  };
}

/** API error field → form field. */
export const TASK_FIELD_MAP = {
  ...PROJECT_FIELD_MAP,
  projectId: "project",
  status: "status",
  dueDate: "dueDate"
} as const;
