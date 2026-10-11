import { describe, expect, it } from "vitest";
import type { Ref } from "@/features/time/types";
import {
  bookingDays,
  defaultRange,
  isBookable,
  parseRange,
  rangeLabel,
  type BookingDay,
  type BookingLog,
  type DateRange
} from "./days";

const ref = (id: string | null, title: string, deleted = false): Ref => ({
  id,
  title,
  deleted
});
const nvidia = ref("p-nvidia", "Nvidia");
const anthropic = ref("p-anthropic", "Anthropic");
const pmInternal = ref("p-pmi", "PM Internal");

const log = (over: Partial<BookingLog> & { id: string }): BookingLog => ({
  workDate: "2026-10-06",
  durationMinutes: 60,
  text: "Work",
  title: null,
  project: null,
  task: null,
  excludeFromStats: false,
  bookingDate: null,
  ...over
});

/** The owner's logs (spec, Acceptance criteria), in API order. */
const g = log({
  id: "g",
  workDate: "2026-09-30",
  durationMinutes: 60,
  project: nvidia,
  task: ref("t-pm", "PM"),
  bookingDate: "2026-10-01"
});
const a = log({
  id: "a",
  durationMinutes: 120,
  project: anthropic,
  task: ref("t-meet", "Meetings"),
  bookingDate: "2026-10-07"
});
const b = log({ id: "b", durationMinutes: 60, project: pmInternal });
const c = log({ id: "c", durationMinutes: 45 });
const d = log({
  id: "d",
  durationMinutes: 90,
  project: anthropic,
  excludeFromStats: true
});
const e = log({
  id: "e",
  workDate: "2026-10-07",
  durationMinutes: 240,
  project: nvidia,
  task: ref("t-dev", "Development"),
  bookingDate: "2026-10-07"
});
const f = log({
  id: "f",
  workDate: "2026-10-07",
  durationMinutes: 135,
  project: anthropic,
  task: ref("t-meet", "Meetings")
});
const ownerLogs = [g, a, b, c, d, e, f];
const range: DateRange = { from: "2026-10-01", to: "2026-10-09" };

const figures = (day: BookingDay) => ({
  logged: day.logged,
  billable: day.billable,
  overtime: day.overtime,
  bookedCurrent: day.bookedCurrent,
  bookedExternal: day.bookedExternal,
  bookedTotal: day.bookedTotal
});
const dayOf = (days: BookingDay[], date: string) =>
  days.find((day) => day.workDate === date)!;
const ids = (day: BookingDay, key: string) =>
  day.groups.find((gr) => gr.key === key)!.entries.map((en) => en.log.id);

describe("Bookings day logic (feat-book-web)", () => {
  it("AC-1 FR-BOOK-001: the owner's logs list 1, 6 and 7 Oct, oldest first", () => {
    expect(
      bookingDays(ownerLogs, range, 420).map((day) => day.workDate)
    ).toEqual(["2026-10-01", "2026-10-06", "2026-10-07"]);
  });

  it("AC-2 FR-BOOK-002 FR-BOOK-003: 6 Oct figures and groups; an excluded log is Non-prod although it has a project", () => {
    const day = dayOf(bookingDays(ownerLogs, range, 420), "2026-10-06");
    expect(figures(day)).toEqual({
      logged: 315,
      billable: 225,
      overtime: 0,
      bookedCurrent: 0,
      bookedExternal: 0,
      bookedTotal: 0
    });
    expect(
      day.groups.map((gr) => [
        gr.key,
        gr.kind,
        gr.project,
        gr.worked,
        gr.booked,
        gr.unbookedIds
      ])
    ).toEqual([
      ["p-anthropic", "project", anthropic, 120, 0, []],
      ["p-pmi", "project", pmInternal, 60, 0, ["b"]],
      ["unsorted", "unsorted", null, 45, 0, []],
      ["nonprod", "nonprod", null, 90, 0, []]
    ]);
    expect(ids(day, "p-anthropic")).toEqual(["a"]);
    expect(ids(day, "nonprod")).toEqual(["d"]);
    expect(day.groups[0].entries[0]).toEqual({
      log: a,
      worked: 120,
      booked: 0,
      incoming: false
    });
  });

  it("AC-3 FR-BOOK-002 FR-BOOK-003 OQ-122: 7 Oct figures, an incoming log in its project's group, groups add up to the total", () => {
    const day = dayOf(bookingDays(ownerLogs, range, 420), "2026-10-07");
    expect(figures(day)).toEqual({
      logged: 375,
      billable: 375,
      overtime: 0,
      bookedCurrent: 240,
      bookedExternal: 120,
      bookedTotal: 360
    });
    expect(
      day.groups.map((gr) => [gr.key, gr.worked, gr.booked, gr.unbookedIds])
    ).toEqual([
      ["p-nvidia", 240, 240, []],
      ["p-anthropic", 135, 120, ["f"]]
    ]);
    expect(day.groups[1].entries).toEqual([
      { log: f, worked: 135, booked: 0, incoming: false },
      { log: a, worked: 0, booked: 120, incoming: true }
    ]);
    expect(day.groups.reduce((sum, gr) => sum + gr.booked, 0)).toBe(
      day.bookedTotal
    );
  });

  it("AC-4 FR-BOOK-001 FR-BOOK-002: 1 Oct holds only an incoming log; a non-bookable log's booking counts nowhere; overtime over the target", () => {
    const day = dayOf(bookingDays(ownerLogs, range, 420), "2026-10-01");
    expect(figures(day)).toEqual({
      logged: 0,
      billable: 0,
      overtime: 0,
      bookedCurrent: 0,
      bookedExternal: 60,
      bookedTotal: 60
    });
    expect(
      day.groups.map((gr) => [gr.key, gr.project, gr.worked, gr.booked])
    ).toEqual([["p-nvidia", nvidia, 0, 60]]);
    expect(day.groups[0].entries).toEqual([
      { log: g, worked: 0, booked: 60, incoming: true }
    ]);

    // Non-bookable logs with a booking date: an unsorted one booked to another day, an excluded one booked to its own day.
    const unsortedBooked = log({
      id: "x",
      workDate: "2026-10-02",
      bookingDate: "2026-10-03"
    });
    const excludedBooked = log({
      id: "y",
      project: anthropic,
      excludeFromStats: true,
      bookingDate: "2026-10-06"
    });
    const days = bookingDays(
      [...ownerLogs, unsortedBooked, excludedBooked],
      range,
      420
    );
    expect(days.map((day) => day.workDate)).toEqual([
      "2026-10-01",
      "2026-10-02",
      "2026-10-06",
      "2026-10-07"
    ]);
    const second = dayOf(days, "2026-10-02");
    expect(second.bookedTotal).toBe(0);
    expect(second.groups.map((gr) => [gr.key, gr.booked])).toEqual([
      ["unsorted", 0]
    ]);
    const sixth = dayOf(days, "2026-10-06");
    expect(sixth.bookedCurrent).toBe(0);
    expect(sixth.bookedTotal).toBe(0);
    const nonprod = sixth.groups.find((gr) => gr.key === "nonprod")!;
    expect(nonprod.booked).toBe(0);
    expect(nonprod.entries.map((en) => [en.log.id, en.booked])).toEqual([
      ["d", 0],
      ["y", 0]
    ]);

    const long = bookingDays(
      [
        log({
          id: "h",
          workDate: "2026-10-09",
          durationMinutes: 480,
          project: pmInternal
        })
      ],
      range,
      420
    );
    expect(long[0].overtime).toBe(60);
  });

  it("AC-5 FR-BOOK-001 FR-BOOK-004 OQ-125: isBookable, defaultRange, parseRange and rangeLabel", () => {
    expect(isBookable({ excludeFromStats: true, project: anthropic })).toBe(
      false
    );
    expect(isBookable({ excludeFromStats: false, project: null })).toBe(false);
    expect(
      isBookable({
        excludeFromStats: false,
        project: ref(null, "Old project", true)
      })
    ).toBe(true);

    const today = "2026-10-09";
    const october = { from: "2026-10-01", to: "2026-10-09" };
    expect(defaultRange(today)).toEqual(october);

    expect(parseRange("2026-09-01", "2026-10-09", today)).toEqual({
      from: "2026-09-01",
      to: "2026-10-09"
    });
    // 366 days apart: still allowed.
    expect(parseRange("2025-10-08", "2026-10-09", today)).toEqual({
      from: "2025-10-08",
      to: "2026-10-09"
    });
    expect(parseRange(null, null, today)).toEqual(october);
    expect(parseRange("2026-09-01", null, today)).toEqual(october);
    expect(parseRange("2026-02-30", "2026-10-09", today)).toEqual(october);
    expect(parseRange("2026-10-05", "2026-10-01", today)).toEqual(october);
    expect(parseRange("2026-10-01", "2026-10-10", today)).toEqual(october);
    // 367 days apart.
    expect(parseRange("2025-10-07", "2026-10-09", today)).toEqual(october);

    expect(rangeLabel(october)).toBe("October 2026");
    expect(rangeLabel({ from: "2026-09-01", to: "2026-10-09" })).toBe(
      "1 Sep 2026 – 9 Oct 2026"
    );
  });
});
