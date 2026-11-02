import { dayFigures } from "./day";
import type { Day } from "./types";

/** Unlogged minutes from which the reminder shows, and the step at which a dismissed one comes back. */
export const REMINDER_STEP = 15;

export interface LogReminder {
  /** Minutes since start + logged. */
  unlogged: number;
  /** Start + logged, in minutes after midnight: where the unlogged time begins. */
  since: number;
}

/**
 * Today's reminder to log time: the day has a start and at least one log, all its logs (excluded ones too) add up to
 * less than the daily target, and at least 15 min since start + logged are unlogged. Null otherwise.
 */
export function logReminder(
  day: Day,
  nowMinute: number | null,
  targetMinutes: number
): LogReminder | null {
  if (day.startMinute === null || day.logs.length === 0) return null;
  const f = dayFigures(day.startMinute, day.logs, nowMinute, targetMinutes);
  if (f.logged >= targetMinutes) return null;
  if (f.unlogged === null || f.unlogged < REMINDER_STEP) return null;
  return { unlogged: f.unlogged, since: day.startMinute + f.logged };
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
