import { describe, expect, it } from "vitest";
import {
  dismissalOf,
  isDismissed,
  logReminder,
  reminderMinutes
} from "./reminder";
import type { Day, TimeLog } from "./types";

const log = (
  id: string,
  durationMinutes: number,
  excludeFromStats = false
): TimeLog => ({
  id,
  workDate: "2026-10-09",
  durationMinutes,
  text: "Work",
  title: null,
  project: null,
  task: null,
  excludeFromStats
});

const dayOf = (startMinute: number | null, logs: TimeLog[]): Day => ({
  workDate: "2026-10-09",
  startMinute,
  totalMinutes: logs.reduce((sum, l) => sum + l.durationMinutes, 0),
  logs
});

describe("reminder (feat-tlog-reminder D5, feat-tlog-billable-reminder D4, feat-tlog-reminder-all-logged D1 D2)", () => {
  it("AC-1 FR-TLOG-021 (feat-tlog-reminder-all-logged D1 D2): logReminder from 15 min unlogged = min(now − start − logged, target − billable), excluded logs fill the time but not the target; since = start + logged; dismissalOf; isDismissed until since changes or another 15 min pass", () => {
    // Start 08:00, 2h logged → unlogged since 10:00.
    const day = dayOf(480, [log("a", 60), log("b", 60)]);
    expect(logReminder(day, 614, 420)).toBeNull();
    expect(logReminder(day, 615, 420)).toEqual({ unlogged: 15, since: 600 });

    // One of the two logs excluded: still 2h logged → unlogged since 10:00.
    const excluded = dayOf(480, [log("a", 60), log("b", 60, true)]);
    expect(logReminder(excluded, 614, 420)).toBeNull();
    expect(logReminder(excluded, 615, 420)).toEqual({
      unlogged: 15,
      since: 600
    });

    // Owner's examples: 6h logged (1h excluded) at 14:30 → 30m; 7h 45m logged (1h excluded) at 16:30 → the target caps it at 15m.
    expect(
      logReminder(dayOf(480, [log("a", 300), log("b", 60, true)]), 870, 420)
    ).toEqual({ unlogged: 30, since: 840 });
    expect(
      logReminder(dayOf(480, [log("a", 405), log("b", 60, true)]), 990, 420)
    ).toEqual({ unlogged: 15, since: 945 });

    // 5h billable at 17:00: the target caps it at 2h; 2h more excluded leave 2h since the start.
    expect(logReminder(dayOf(480, [log("a", 300)]), 1020, 420)).toEqual({
      unlogged: 120,
      since: 780
    });
    expect(
      logReminder(dayOf(480, [log("a", 300), log("b", 120, true)]), 1020, 420)
    ).toEqual({ unlogged: 120, since: 900 });
    // The billable target is met: no reminder, however much is unlogged.
    expect(
      logReminder(dayOf(480, [log("a", 420), log("b", 60, true)]), 1020, 420)
    ).toBeNull();
    expect(logReminder(dayOf(480, [log("a", 420)]), 1020, 420)).toBeNull();

    expect(logReminder(dayOf(null, day.logs), 615, 420)).toBeNull();
    expect(logReminder(dayOf(480, []), 615, 420)).toBeNull();
    expect(logReminder(day, null, 420)).toBeNull();

    const dismissal = dismissalOf("2026-10-09", { unlogged: 20, since: 600 });
    expect(dismissal).toEqual({ workDate: "2026-10-09", since: 600, steps: 1 });
    expect(
      isDismissed("2026-10-09", { unlogged: 29, since: 600 }, dismissal)
    ).toBe(true);
    expect(
      isDismissed("2026-10-09", { unlogged: 30, since: 600 }, dismissal)
    ).toBe(false);
    expect(
      isDismissed("2026-10-09", { unlogged: 20, since: 615 }, dismissal)
    ).toBe(false);
    expect(
      isDismissed("2026-10-10", { unlogged: 20, since: 600 }, dismissal)
    ).toBe(false);
    expect(isDismissed("2026-10-09", { unlogged: 20, since: 600 }, null)).toBe(
      false
    );
  });

  it("AC-2 FR-TLOG-021 (feat-tlog-billable-reminder D4): reminderMinutes rounds unlogged down to whole 15 min, 15 min at least", () => {
    const minutes = (unlogged: number) =>
      reminderMinutes({ unlogged, since: 600 });
    expect(minutes(15)).toBe(15);
    expect(minutes(29)).toBe(15);
    expect(minutes(80)).toBe(75);
    expect(minutes(120)).toBe(120);
  });
});
