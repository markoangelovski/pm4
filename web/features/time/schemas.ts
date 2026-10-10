import { z } from "zod";
import { formatDuration } from "@/lib/time";
import { parseDurationInput } from "./duration";
import type { ProjectRef, TaskRef, TimeLog, TimeLogInput } from "./types";

export const logFormSchema = z.object({
  date: z.string(),
  dayStart: z.number().nullable(),
  text: z.string().trim().min(1, "Describe what you worked on.").max(1000),
  duration: z.string().superRefine((v, ctx) => {
    const r = parseDurationInput(v);
    if (!r.ok) ctx.addIssue({ code: "custom", message: r.error });
  }),
  title: z.string().trim().max(100),
  project: z.custom<ProjectRef | null>(),
  task: z.custom<TaskRef | null>(),
  excludeFromStats: z.boolean()
});
export type LogFormValues = z.infer<typeof logFormSchema>;

export function logFormDefaults(
  log: TimeLog | undefined,
  date: string,
  nowQuarter: number | null
): LogFormValues {
  if (log) {
    return {
      date: log.workDate,
      dayStart: null,
      text: log.text,
      duration: formatDuration(log.durationMinutes),
      title: log.title ?? "",
      excludeFromStats: log.excludeFromStats,
      project: log.project?.id
        ? { id: log.project.id, title: log.project.title }
        : null,
      task:
        log.task?.id && log.project?.id
          ? {
              id: log.task.id,
              title: log.task.title,
              project: { id: log.project.id, title: log.project.title }
            }
          : null
    };
  }
  return {
    date,
    dayStart: nowQuarter,
    text: "",
    duration: "",
    title: "",
    project: null,
    task: null,
    excludeFromStats: false
  };
}

export function toLogInput(
  values: LogFormValues,
  needsDayStart: boolean,
  linkChanged: boolean
): TimeLogInput {
  const parsed = parseDurationInput(values.duration);
  return {
    workDate: values.date,
    durationMinutes: parsed.ok ? parsed.minutes : 0,
    text: values.text.trim(),
    title: values.title.trim() || null,
    excludeFromStats: values.excludeFromStats,
    ...(linkChanged
      ? {
          projectId: values.task?.project.id ?? values.project?.id ?? null,
          taskId: values.task?.id ?? null
        }
      : {}),
    ...(needsDayStart && values.dayStart !== null
      ? { dayStartMinute: values.dayStart }
      : {})
  };
}

export const LOG_FIELD_MAP = {
  workDate: "date",
  dayStartMinute: "dayStart",
  text: "text",
  durationMinutes: "duration",
  title: "title",
  projectId: "project",
  taskId: "task",
  excludeFromStats: "excludeFromStats"
} as const;
