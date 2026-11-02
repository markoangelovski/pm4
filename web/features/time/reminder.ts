import type { Day } from "./types";

/** Unlogged minutes from which the reminder shows, and the step at which a dismissed one comes back. */
export const REMINDER_STEP = 15;

export interface LogReminder {
  /** Minutes since start + logged. */
  unlogged: number;
  /** Start + logged, in minutes after midnight: where the unlogged time begins. */
  since: number;
}

/** A dismissed reminder: it stays hidden while its day and start + logged are the same and fewer than another 15 min pass. */
export interface ReminderDismissal {
  workDate: string;
  since: number;
  /** floor(unlogged / 15) when dismissed. */
  steps: number;
}

export function logReminder(
  day: Day,
  nowMinute: number | null,
  targetMinutes: number
): LogReminder | null {
  void day;
  void nowMinute;
  void targetMinutes;
  throw new Error("not implemented (feat-tlog-reminder)");
}

export function dismissalOf(
  workDate: string,
  reminder: LogReminder
): ReminderDismissal {
  void workDate;
  void reminder;
  throw new Error("not implemented (feat-tlog-reminder)");
}

export function isDismissed(
  workDate: string,
  reminder: LogReminder,
  dismissal: ReminderDismissal | null
): boolean {
  void workDate;
  void reminder;
  void dismissal;
  throw new Error("not implemented (feat-tlog-reminder)");
}
