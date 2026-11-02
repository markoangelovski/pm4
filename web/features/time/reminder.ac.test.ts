import { describe, expect, it } from "vitest";
import { dismissalOf, isDismissed, logReminder } from "./reminder";
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

describe("reminder (feat-tlog-reminder D5)", () => {
  it("AC-1 FR-TLOG-021: logReminder from 15 min unlogged (excluded logs count); dismissalOf; isDismissed until start + logged changes or another 15 min pass", () => {
    // Start 08:00, 2h logged (one log excluded) → unlogged since 10:00.
    const day = dayOf(480, [log("a", 60), log("b", 60, true)]);
    expect(logReminder(day, 614, 420)).toBeNull();
    expect(logReminder(day, 615, 420)).toEqual({ unlogged: 15, since: 600 });

    expect(logReminder(dayOf(null, day.logs), 615, 420)).toBeNull();
    expect(logReminder(dayOf(480, []), 615, 420)).toBeNull();
    expect(
      logReminder(dayOf(480, [log("a", 300), log("b", 120, true)]), 1000, 420)
    ).toBeNull();
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
});
