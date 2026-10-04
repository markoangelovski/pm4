import { addDays, format, parseISO } from "date-fns";
import type { TaskStatus } from "@/features/tasks/status";

export type DueState = "overdue" | "due-soon" | null;

/** D3: overdue = before today; due soon = today or tomorrow; completed / no date → null. */
export function dueState(
  dueDate: string | null,
  status: TaskStatus,
  today: string
): DueState {
  if (dueDate === null || status === "completed") return null;
  if (dueDate < today) return "overdue";
  const tomorrow = format(addDays(parseISO(today), 1), "yyyy-MM-dd");
  return dueDate <= tomorrow ? "due-soon" : null;
}
