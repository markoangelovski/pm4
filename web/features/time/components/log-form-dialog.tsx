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
  FieldDescription,
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
import { formatClock, nowMinute, roundToQuarter } from "@/lib/time/clock";
import { formatDuration, today } from "@/lib/time";
import { useMe } from "@/features/users/api";
import { applyFieldErrors, isApiError } from "@/lib/api/problem";
import { useCreateLog, useDay, useUpdateLog } from "../api";
import { parseDurationInput } from "../duration";
import {
  LOG_FIELD_MAP,
  logFormDefaults,
  logFormSchema,
  toLogInput,
  type LogFormValues
} from "../schemas";
import type { TimeLog } from "../types";
import { DateField } from "./date-field";
import { LogProjectPicker } from "./log-project-picker";
import { TaskPicker } from "./task-picker";

export const START_OPTIONS = Array.from({ length: 96 }, (_, i) => ({
  value: i * 15,
  label: formatClock(i * 15)
}));

/** SCR-041: add (no `log`) or edit a log. Mounts its form only while open. */
export function LogFormDialog({
  open,
  onOpenChange,
  log,
  defaultDate,
  onSaved
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log?: TimeLog;
  defaultDate: string;
  onSaved?: (date: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-md! sm:max-w-lg max-h-[92vh] overflow-y-auto">
        {open ? (
          <LogForm
            log={log}
            defaultDate={defaultDate}
            onDone={(d) => {
              onOpenChange(false);
              onSaved?.(d);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function LogForm({
  log,
  defaultDate,
  onDone
}: {
  log?: TimeLog;
  defaultDate: string;
  onDone: (date: string) => void;
}) {
  const { data: me } = useMe();
  const timeZone = me?.timeZone ?? "UTC";
  const todayStr = today(timeZone);
  const create = useCreateLog();
  const update = useUpdateLog(log?.id ?? "");
  const save = log ? update : create;
  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    formState: { errors }
  } = useForm<LogFormValues>({
    resolver: zodResolver(logFormSchema),
    defaultValues: (() => {
      const base = logFormDefaults(log, defaultDate, null);
      return {
        ...base,
        dayStart:
          base.date === todayStr ? roundToQuarter(nowMinute(timeZone)) : null
      };
    })()
  });
  const [date, dayStart, duration, project, task] = useWatch({
    control,
    name: ["date", "dayStart", "duration", "project", "task"]
  });
  // OQ-150: a deleted project/task stays in its box until another one is picked or the box is cleared.
  const [keepDeleted, setKeepDeleted] = useState(true);
  const deletedProject =
    keepDeleted && log?.project && !log.project.id ? log.project.title : null;
  const deletedTask =
    keepDeleted && log?.task && !log.task.id ? log.task.title : null;
  const day = useDay(date);
  // Editing keeps the log's own date's start; moving it to a day without a start asks for one.
  const needsDayStart = day.data?.startMinute === null;
  const parsed = duration.trim() ? parseDurationInput(duration) : null;

  const onSubmit = handleSubmit(async (values) => {
    // The day decides whether the start is needed: wait for the request already in flight.
    const dayData =
      day.data ?? (await day.refetch({ cancelRefetch: false })).data;
    if (!dayData) {
      toast.error("Couldn't save the log.");
      return;
    }
    const needsDayStart = dayData.startMinute === null;
    if (needsDayStart && values.dayStart === null) {
      setError("dayStart", { message: "Enter when you started working." });
      return;
    }
    if (values.date > todayStr) {
      setError("date", { message: "Pick today or an earlier date." });
      return;
    }
    try {
      // Dropping a deleted name relinks the log too, which clears the saved names (API-TLOG-004).
      const hadDeleted = [log?.project, log?.task].some((r) => r && !r.id);
      const linkChanged =
        !log ||
        (hadDeleted && !keepDeleted) ||
        (values.project?.id ?? null) !== (log.project?.id ?? null) ||
        (values.task?.id ?? null) !== (log.task?.id ?? null);
      await save.mutateAsync(toLogInput(values, needsDayStart, linkChanged));
      toast.success(log ? "Log saved" : "Log added");
      onDone(values.date);
    } catch (error) {
      if (applyFieldErrors(error, setError, LOG_FIELD_MAP)) return;
      if (isApiError(error, 404)) {
        setError("task", { message: "This item no longer exists." });
        return;
      }
      toast.error("Couldn't save the log.");
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{log ? "Edit log" : "Log time"}</DialogTitle>
        <DialogDescription className="sr-only">
          {log ? "Change this log." : "Record time you worked."}
        </DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.date}>
            <FieldLabel htmlFor="log-date">Date</FieldLabel>
            <DateField
              id="log-date"
              value={date}
              max={todayStr}
              invalid={!!errors.date}
              onChange={(d) => {
                setValue("date", d);
                clearErrors(["date", "dayStart"]);
                setValue(
                  "dayStart",
                  d === todayStr ? roundToQuarter(nowMinute(timeZone)) : null
                );
              }}
            />
            <FieldError errors={[errors.date]} />
          </Field>
          {needsDayStart ? (
            <Field data-invalid={!!errors.dayStart}>
              <FieldLabel htmlFor="log-day-start">Day started at</FieldLabel>
              <Select
                items={START_OPTIONS}
                value={dayStart}
                onValueChange={(v) => {
                  setValue("dayStart", v as number);
                  clearErrors("dayStart");
                }}
              >
                <SelectTrigger
                  id="log-day-start"
                  aria-invalid={!!errors.dayStart || undefined}
                  className="w-full cursor-pointer rounded-md!"
                >
                  <SelectValue placeholder="HH:mm" />
                </SelectTrigger>
                <SelectContent
                  className="max-h-64"
                  alignItemWithTrigger={false}
                >
                  {START_OPTIONS.map((o) => (
                    <SelectItem
                      key={o.value}
                      value={o.value}
                      className="cursor-pointer"
                    >
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[errors.dayStart]} />
            </Field>
          ) : null}
        </div>
        <Field data-invalid={!!errors.text}>
          <FieldLabel htmlFor="log-text">Log text</FieldLabel>
          <Textarea
            id="log-text"
            rows={3}
            autoFocus
            placeholder="What did you work on?"
            {...register("text")}
            aria-invalid={!!errors.text || undefined}
          />
          <FieldError errors={[errors.text]} />
        </Field>
        <Field data-invalid={!!errors.duration}>
          <FieldLabel htmlFor="log-duration">Duration</FieldLabel>
          <Input
            id="log-duration"
            placeholder="e.g. 0.25, 45 or 1h 15m"
            autoComplete="off"
            {...register("duration")}
            aria-invalid={!!errors.duration || undefined}
          />
          {errors.duration ? (
            <FieldError errors={[errors.duration]} />
          ) : parsed?.ok ? (
            <FieldDescription>
              = {formatDuration(parsed.minutes)}
            </FieldDescription>
          ) : null}
        </Field>
        <Field data-invalid={!!errors.title}>
          <FieldLabel htmlFor="log-title">
            Title{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </FieldLabel>
          <Input
            id="log-title"
            maxLength={100}
            {...register("title")}
            aria-invalid={!!errors.title || undefined}
          />
          <FieldError errors={[errors.title]} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="log-project">
              Project{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </FieldLabel>
            <Controller
              control={control}
              name="project"
              render={({ field }) => (
                <LogProjectPicker
                  id="log-project"
                  value={task ? task.project : field.value}
                  deletedTitle={deletedProject}
                  disabled={!!task}
                  onChange={(p) => {
                    setKeepDeleted(false);
                    field.onChange(p);
                    if (!p || (task && task.project.id !== p.id))
                      setValue("task", null);
                  }}
                />
              )}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="log-task">
              Task{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </FieldLabel>
            <Controller
              control={control}
              name="task"
              render={({ field }) => (
                <TaskPicker
                  id="log-task"
                  value={field.value}
                  deletedTitle={deletedTask}
                  projectId={project?.id ?? null}
                  onChange={(t) => {
                    setKeepDeleted(false);
                    field.onChange(t);
                    if (t) setValue("project", t.project);
                  }}
                />
              )}
            />
            <FieldError errors={[errors.task]} />
          </Field>
        </div>
        <Field orientation="horizontal">
          <input
            id="log-exclude"
            type="checkbox"
            {...register("excludeFromStats")}
            className="size-4 cursor-pointer accent-primary"
          />
          <FieldLabel
            htmlFor="log-exclude"
            className="cursor-pointer font-normal"
          >
            Exclude from statistics
          </FieldLabel>
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
        <Button
          type="submit"
          disabled={save.isPending}
          className="cursor-pointer"
        >
          {log
            ? save.isPending
              ? "Saving…"
              : "Save"
            : save.isPending
              ? "Saving…"
              : "Log time"}
        </Button>
      </DialogFooter>
    </form>
  );
}
