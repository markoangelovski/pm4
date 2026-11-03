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

describe("reminder (feat-tlog-reminder D5, feat-tlog-billable-reminder D3 D4)", () => {
  it("AC-1 FR-TLOG-021 (feat-tlog-billable-reminder D3): logReminder from 15 min unlogged = min(now − start − billable, target − billable), excluded logs don't count; dismissalOf; isDismissed until since changes or another 15 min pass", () => {
    // Start 08:00, 2h billable → unlogged since 10:00.
    const day = dayOf(480, [log("a", 60), log("b", 60)]);
    expect(logReminder(day, 614, 420)).toBeNull();
    expect(logReminder(day, 615, 420)).toEqual({ unlogged: 15, since: 600 });

    // One of the two logs excluded: 1h billable → unlogged since 09:00.
    const excluded = dayOf(480, [log("a", 60), log("b", 60, true)]);
    expect(logReminder(excluded, 554, 420)).toBeNull();
    expect(logReminder(excluded, 555, 420)).toEqual({
      unlogged: 15,
      since: 540
    });

    // 5h billable at 17:00: the target caps it at 2h; excluded logs change nothing.
    expect(logReminder(dayOf(480, [log("a", 300)]), 1020, 420)).toEqual({
      unlogged: 120,
      since: 780
    });
    expect(
      logReminder(dayOf(480, [log("a", 300), log("b", 120, true)]), 1020, 420)
    ).toEqual({ unlogged: 120, since: 780 });
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
