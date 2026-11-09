import { describe, expect, it } from "vitest";
import { timeline } from "./day";
import type { TimeLog } from "./types";

const log = (id: string, durationMinutes: number): TimeLog => ({
  id,
  workDate: "2026-10-07",
  durationMinutes,
  text: "Work",
  title: null,
  project: null,
  task: null,
  excludeFromStats: false
});

const logsOf = (...minutes: number[]) =>
  minutes.map((m, i) => log(`l${i + 1}`, m));

const ranges = (t: ReturnType<typeof timeline>) =>
  t.rows.map((r) => [r.from, r.to]);

describe("timeline (feat-tlog-timeline)", () => {
  it("AC-1 FR-TLOG-023: each log starts where the previous one ended, from the start; the axis spans whole hours", () => {
    const logs = logsOf(60, 15, 45);
    const t = timeline(480, logs, null);
    expect(t.rows.map((r) => r.log)).toEqual(logs);
    expect(ranges(t)).toEqual([
      [480, 540],
      [540, 555],
      [555, 600]
    ]);
    expect(t.axisStart).toBe(480);
    expect(t.axisEnd).toBe(600);
    expect(t.ticks).toEqual([480, 540, 600]);
    expect(t.clock).toBe(true);
  });

  it("AC-2 FR-TLOG-023: now past the last log stretches the axis (ticks every 2 h); now before the end doesn't", () => {
    const later = timeline(480, logsOf(60, 15, 45), 860);
    expect(ranges(later)).toEqual([
      [480, 540],
      [540, 555],
      [555, 600]
    ]);
    expect(later.axisStart).toBe(480);
    expect(later.axisEnd).toBe(960);
    expect(later.ticks).toEqual([480, 600, 720, 840, 960]);

    const earlier = timeline(480, logsOf(60, 15, 45), 500);
    expect(earlier.axisStart).toBe(480);
    expect(earlier.axisEnd).toBe(600);
    expect(earlier.ticks).toEqual([480, 540, 600]);
  });

  it("AC-3 FR-TLOG-023: without a start the rows count from 0, now is ignored, clock is false", () => {
    const t = timeline(null, logsOf(60, 15, 45, 90), 860);
    expect(ranges(t)).toEqual([
      [0, 60],
      [60, 75],
      [75, 120],
      [120, 210]
    ]);
    expect(t.axisStart).toBe(0);
    expect(t.axisEnd).toBe(240);
    expect(t.ticks).toEqual([0, 60, 120, 180, 240]);
    expect(t.clock).toBe(false);
  });

  it("AC-4 FR-TLOG-023: a start off the hour, a day past midnight, a day without logs", () => {
    const offHour = timeline(510, logsOf(30), null);
    expect(ranges(offHour)).toEqual([[510, 540]]);
    expect(offHour.axisStart).toBe(480);
    expect(offHour.axisEnd).toBe(540);
    expect(offHour.ticks).toEqual([480, 540]);

    const late = timeline(1320, logsOf(240), null);
    expect(ranges(late)).toEqual([[1320, 1560]]);
    expect(late.axisStart).toBe(1320);
    expect(late.axisEnd).toBe(1560);
    expect(late.ticks).toEqual([1320, 1380, 1440, 1500, 1560]);

    const empty = timeline(480, [], null);
    expect(empty.rows).toEqual([]);
    expect(empty.axisStart).toBe(480);
    expect(empty.axisEnd).toBe(540);
    expect(empty.ticks).toEqual([480, 540]);
  });
});
