import { describe, expect, it } from "vitest";
import {
  MAX_RANGE_DAYS,
  PRESET_LABELS,
  RANGE_PRESETS,
  isRangeTooLong,
  matchPreset,
  parseRange,
  presetRange,
  rangeLabel,
  weekdaysSoFar,
  type DateRange
} from "./range";
import {
  buckets,
  dayStats,
  hourTicks,
  running,
  totals,
  type ReportDay
} from "./stats";

const TODAY = "2026-10-09";
const TARGET = 420;
const october: DateRange = { from: "2026-10-01", to: "2026-10-31" };

const day = (
  workDate: string,
  startMinute: number | null,
  workedMinutes: number,
  bookedMinutes: number
): ReportDay => ({ workDate, startMinute, workedMinutes, bookedMinutes });

/** The report's days (spec, Acceptance criteria). */
const reportDays: ReportDay[] = [
  day("2026-10-01", 480, 0, 0),
  day("2026-10-06", 510, 315, 120),
  day("2026-10-07", 555, 375, 240)
];

describe("dashboard range (feat-rpt-web)", () => {
  it("AC-1 FR-RPT-001: presets, matching, parsing, labels and weekdays so far", () => {
    expect(RANGE_PRESETS.map((p) => PRESET_LABELS[p])).toEqual([
      "This month",
      "Last month",
      "Last 7 days",
      "Last 30 days",
      "Last 90 days",
      "This year"
    ]);
    expect(MAX_RANGE_DAYS).toBe(366);

    const expected: Record<string, DateRange> = {
      "this-month": { from: "2026-10-01", to: "2026-10-31" },
      "last-month": { from: "2026-09-01", to: "2026-09-30" },
      "last-7": { from: "2026-10-03", to: "2026-10-09" },
      "last-30": { from: "2026-09-10", to: "2026-10-09" },
      "last-90": { from: "2026-07-12", to: "2026-10-09" },
      "this-year": { from: "2026-01-01", to: "2026-10-09" }
    };
    for (const preset of RANGE_PRESETS) {
      expect(presetRange(preset, TODAY)).toEqual(expected[preset]);
      expect(matchPreset(expected[preset], TODAY)).toBe(preset);
    }
    expect(
      matchPreset({ from: "2026-10-02", to: "2026-10-09" }, TODAY)
    ).toBeNull();

    // parseRange: kept as given.
    expect(parseRange("2025-10-08", "2026-10-09", TODAY)).toEqual({
      from: "2025-10-08",
      to: "2026-10-09"
    });
    expect(parseRange("2026-11-01", "2026-11-30", TODAY)).toEqual({
      from: "2026-11-01",
      to: "2026-11-30"
    });
    // parseRange: anything else → this month.
    expect(parseRange(null, null, TODAY)).toEqual(october);
    expect(parseRange("2026-10-01", null, TODAY)).toEqual(october);
    expect(parseRange("2026-02-30", "2026-03-05", TODAY)).toEqual(october);
    expect(parseRange("2026-10-09", "2026-10-01", TODAY)).toEqual(october);
    expect(parseRange("2025-10-07", "2026-10-09", TODAY)).toEqual(october);

    expect(isRangeTooLong({ from: "2025-10-08", to: "2026-10-09" })).toBe(
      false
    );
    expect(isRangeTooLong({ from: "2025-10-07", to: "2026-10-09" })).toBe(
      true
    );

    expect(rangeLabel(october)).toBe("October 2026");
    expect(rangeLabel({ from: "2026-09-01", to: "2026-10-09" })).toBe(
      "1 Sep 2026 – 9 Oct 2026"
    );
    expect(rangeLabel({ from: "2026-10-01", to: "2026-10-09" })).toBe(
      "1 Oct 2026 – 9 Oct 2026"
    );

    expect(weekdaysSoFar(october, TODAY)).toBe(7);
  });
});

describe("dashboard stats (feat-rpt-web)", () => {
  it("AC-2 FR-RPT-002 FR-RPT-003: dayStats fills the range, totals sum it", () => {
    const days = dayStats(october, reportDays);
    expect(days).toHaveLength(31);
    expect(days[0]).toEqual({
      workDate: "2026-10-01",
      startMinute: 480,
      worked: 0,
      booked: 0
    });
    expect(days[1]).toEqual({
      workDate: "2026-10-02",
      startMinute: null,
      worked: 0,
      booked: 0
    });
    expect(days[5]).toEqual({
      workDate: "2026-10-06",
      startMinute: 510,
      worked: 315,
      booked: 120
    });
    expect(days.at(-1)?.workDate).toBe("2026-10-31");

    expect(totals(days, TARGET)).toEqual({
      worked: 690,
      booked: 360,
      workdays: 3,
      target: 1260,
      avgStart: 515,
      earliestStart: 480,
      latestStart: 555
    });
    expect(totals(dayStats(october, []), TARGET)).toMatchObject({
      worked: 0,
      workdays: 0,
      target: 0,
      avgStart: null,
      earliestStart: null,
      latestStart: null
    });
  });

  it("AC-3 FR-RPT-002: buckets by day up to 62 days, weekend days without work left out", () => {
    const oct = buckets(dayStats(october, reportDays), TARGET);
    expect(oct.by).toBe("day");
    expect(oct.items).toHaveLength(22);
    expect(oct.items.map((b) => b.tick).slice(0, 3)).toEqual(["1", "2", "5"]);
    const oct6 = oct.items.find((b) => b.date === "2026-10-06");
    expect(oct6).toMatchObject({
      key: "2026-10-06",
      title: "Tue, 6 Oct 2026",
      startMinute: 510,
      worked: 315,
      booked: 120,
      unbooked: 195,
      target: TARGET,
      workdays: 1
    });
    expect(oct.items.find((b) => b.date === "2026-10-02")).toMatchObject({
      startMinute: null,
      worked: 0,
      target: TARGET,
      workdays: 0
    });

    // Work on Saturday 10 Oct keeps that day.
    const withSaturday = buckets(
      dayStats(october, [...reportDays, day("2026-10-10", null, 120, 0)]),
      TARGET
    );
    expect(withSaturday.items).toHaveLength(23);
    expect(withSaturday.items.map((b) => b.date)).toContain("2026-10-10");

    // 62 days → still by day, ticks with the month.
    const sixtyTwo = buckets(
      dayStats({ from: "2026-08-01", to: "2026-10-01" }, []),
      TARGET
    );
    expect(sixtyTwo.by).toBe("day");
    expect(sixtyTwo.items[0].tick).toBe("3 Aug");
    expect(sixtyTwo.items.at(-1)?.tick).toBe("1 Oct");

    // 63 days → by week.
    expect(
      buckets(dayStats({ from: "2026-08-01", to: "2026-10-02" }, []), TARGET)
        .by
    ).toBe("week");
  });

  it("AC-4 FR-RPT-002: buckets by Monday–Sunday week over 62 days", () => {
    const half = buckets(
      dayStats({ from: "2026-01-01", to: "2026-06-30" }, [
        day("2026-01-05", 480, 300, 60),
        day("2026-01-06", 540, 240, 0)
      ]),
      TARGET
    );
    expect(half.by).toBe("week");
    expect(half.items).toHaveLength(27);
    expect(half.items[0]).toMatchObject({
      key: "2025-12-29",
      date: "2026-01-01",
      tick: "1 Jan",
      title: "Week of 29 Dec – 4 Jan 2026",
      startMinute: null,
      workdays: 0,
      target: 0
    });
    expect(half.items[1]).toMatchObject({
      key: "2026-01-05",
      date: "2026-01-05",
      startMinute: 510,
      worked: 540,
      booked: 60,
      unbooked: 480,
      workdays: 2,
      target: 840
    });
    expect(half.items.at(-1)).toMatchObject({
      key: "2026-06-29",
      date: "2026-06-29"
    });
  });

  it("AC-5 FR-RPT-004: running totals stop after today; hour ticks", () => {
    const points = running(dayStats(october, reportDays), TARGET, TODAY);
    expect(points).toHaveLength(31);
    const at = (date: string) => points.find((p) => p.workDate === date);
    expect(at("2026-10-01")).toEqual({
      workDate: "2026-10-01",
      tick: "1 Oct",
      worked: 0,
      booked: 0,
      target: 420
    });
    expect(at("2026-10-07")).toMatchObject({
      worked: 690,
      booked: 360,
      target: 1260
    });
    expect(at("2026-10-09")).toMatchObject({
      worked: 690,
      booked: 360,
      target: 1260
    });
    expect(at("2026-10-10")).toMatchObject({
      tick: "10 Oct",
      worked: null,
      booked: null,
      target: null
    });

    expect(hourTicks(0)).toEqual([0, 60]);
    expect(hourTicks(450)).toEqual([0, 120, 240, 360, 480]);
  });
});
