import { dayFigures } from "./day";
import type { Day } from "./types";

/** Unlogged minutes from which the reminder shows, and the step at which a dismissed one comes back. */
export const REMINDER_STEP = 15;

export interface LogReminder {
  /** min(now − start − logged, target − billable), in minutes. */
  unlogged: number;
  /** Start + logged (all logs), in minutes after midnight: with the date, what a dismissal holds for (not shown). */
  since: number;
}

/**
 * Today's reminder to log time: the day has a start and at least one log, and at least 15 min are unlogged, where
 * unlogged = min(now − start − logged, daily target − billable). Logged = all logs (they fill the time since the start);
 * billable = logs not excluded from statistics (only they count towards the target). Null otherwise.
 */
export function logReminder(
  day: Day,
  nowMinute: number | null,
  targetMinutes: number
): LogReminder | null {
  if (day.startMinute === null || day.logs.length === 0 || nowMinute === null)
    return null;
  const { logged, billable } = dayFigures(
    day.startMinute,
    day.logs,
    nowMinute,
    targetMinutes
  );
  const unlogged = Math.min(
    nowMinute - day.startMinute - logged,
    targetMinutes - billable
  );
  if (unlogged < REMINDER_STEP) return null;
  return { unlogged, since: day.startMinute + logged };
}

/** The duration a log for the reminder starts with: its unlogged time in whole 15 min (15 min at least). */
export function reminderMinutes(reminder: LogReminder): number {
  return Math.max(
    REMINDER_STEP,
    Math.floor(reminder.unlogged / REMINDER_STEP) * REMINDER_STEP
  );
}

/** A dismissed reminder: it stays hidden while its day and start + logged are the same and fewer than another 15 min pass. */
export interface ReminderDismissal {
  workDate: string;
  since: number;
  /** floor(unlogged / 15) when dismissed. */
  steps: number;
}

export function dismissalOf(
  workDate: string,
  reminder: LogReminder
): ReminderDismissal {
  return {
    workDate,
    since: reminder.since,
    steps: Math.floor(reminder.unlogged / REMINDER_STEP)
  };
}

export function isDismissed(
  workDate: string,
  reminder: LogReminder,
  dismissal: ReminderDismissal | null
): boolean {
  return (
    dismissal !== null &&
    dismissal.workDate === workDate &&
    dismissal.since === reminder.since &&
    Math.floor(reminder.unlogged / REMINDER_STEP) <= dismissal.steps
  );
}
