import { describe, expect, it } from "vitest";
import type { Ref } from "@/features/time/types";
import {
  bookingDays,
  defaultRange,
  isBookable,
  parseRange,
  rangeLabel,
  addBooking,
  bookedMinutes,
  removeBooking,
  unbookedMinutes,
  type BookingDay,
  type BookingEntry,
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
  bookings: [],
  ...over
});

const OCT1_60 = { date: "2026-10-01", minutes: 60 };
const OCT6_30 = { date: "2026-10-06", minutes: 30 };
const OCT7_45 = { date: "2026-10-07", minutes: 45 };
const OCT7_120 = { date: "2026-10-07", minutes: 120 };
const OCT7_240 = { date: "2026-10-07", minutes: 240 };

/** The owner's logs (spec, Acceptance criteria), in API order. */
const g = log({
  id: "g",
  workDate: "2026-09-30",
  durationMinutes: 60,
  project: nvidia,
  task: ref("t-pm", "PM"),
  bookings: [OCT1_60]
});
const a = log({
  id: "a",
  durationMinutes: 120,
  project: anthropic,
  task: ref("t-meet", "Meetings"),
  bookings: [OCT7_120]
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
  bookings: [OCT7_240]
});
const f = log({
  id: "f",
  workDate: "2026-10-07",
  durationMinutes: 135,
  project: anthropic,
  task: ref("t-meet", "Meetings"),
  bookings: [OCT6_30, OCT7_45]
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
const groupOf = (day: BookingDay, key: string) =>
  day.groups.find((gr) => gr.key === key)!;
/** A row of a day (BookingEntry); defaults: one own row, booked elsewhere. */
const entry = (over: Partial<BookingEntry> & { log: BookingLog }) => ({
  booking: null,
  minutes: 0,
  first: true,
  last: true,
  worked: 0,
  booked: 0,
  incoming: false,
  ...over
});

describe("Bookings day logic (feat-book-web, feat-book-partial)", () => {
  it("AC-1 FR-BOOK-001: the owner's logs list 1, 6 and 7 Oct, oldest first", () => {
    expect(
      bookingDays(ownerLogs, range, 420).map((day) => day.workDate)
    ).toEqual(["2026-10-01", "2026-10-06", "2026-10-07"]);
  });

  it("AC-18 FR-BOOK-002 FR-BOOK-003: 6 Oct: a's row is its 7 Oct booking, f comes in with its 6 Oct part, b is one unbooked row; an excluded log is Non-prod", () => {
    const day = dayOf(bookingDays(ownerLogs, range, 420), "2026-10-06");
    expect(figures(day)).toEqual({
      logged: 315,
      billable: 225,
      overtime: 0,
      bookedCurrent: 0,
      bookedExternal: 30,
      bookedTotal: 30
    });
    expect(
      day.groups.map((gr) => [
        gr.key,
        gr.kind,
        gr.project,
        gr.worked,
        gr.booked,
        gr.unbooked.map((l) => l.id)
      ])
    ).toEqual([
      ["p-anthropic", "project", anthropic, 120, 30, []],
      ["p-pmi", "project", pmInternal, 60, 0, ["b"]],
      ["unsorted", "unsorted", null, 45, 0, []],
      ["nonprod", "nonprod", null, 90, 0, []]
    ]);
    expect(groupOf(day, "p-anthropic").entries).toEqual([
      entry({ log: a, booking: OCT7_120, minutes: 120, worked: 120 }),
      entry({
        log: f,
        booking: OCT6_30,
        minutes: 30,
        booked: 30,
        incoming: true
      })
    ]);
    expect(groupOf(day, "p-pmi").entries).toEqual([
      entry({ log: b, minutes: 60, worked: 60 })
    ]);
    expect(ids(day, "nonprod")).toEqual(["d"]);
    expect(day.groups.reduce((sum, gr) => sum + gr.booked, 0)).toBe(
      day.bookedTotal
    );
  });

  it("AC-18 FR-BOOK-002 FR-BOOK-003 OQ-122: 7 Oct: f has a row per booking and one for its unbooked part, a comes in; the groups add up to the total", () => {
    const day = dayOf(bookingDays(ownerLogs, range, 420), "2026-10-07");
    expect(figures(day)).toEqual({
      logged: 375,
      billable: 375,
      overtime: 0,
      bookedCurrent: 285,
      bookedExternal: 120,
      bookedTotal: 405
    });
    expect(
      day.groups.map((gr) => [
        gr.key,
        gr.worked,
        gr.booked,
        gr.unbooked.map((l) => l.id)
      ])
    ).toEqual([
      ["p-nvidia", 240, 240, []],
      ["p-anthropic", 135, 165, ["f"]]
    ]);
    expect(groupOf(day, "p-nvidia").entries).toEqual([
      entry({
        log: e,
        booking: OCT7_240,
        minutes: 240,
        worked: 240,
        booked: 240
      })
    ]);
    expect(groupOf(day, "p-anthropic").entries).toEqual([
      entry({
        log: f,
        booking: OCT6_30,
        minutes: 30,
        last: false,
        worked: 135
      }),
      entry({
        log: f,
        booking: OCT7_45,
        minutes: 45,
        first: false,
        last: false,
        booked: 45
      }),
      entry({ log: f, minutes: 60, first: false }),
      entry({
        log: a,
        booking: OCT7_120,
        minutes: 120,
        booked: 120,
        incoming: true
      })
    ]);
    expect(day.groups.reduce((sum, gr) => sum + gr.booked, 0)).toBe(
      day.bookedTotal
    );
  });

  it("AC-19 FR-BOOK-004 OQ-212: bookedMinutes, unbookedMinutes, addBooking and removeBooking", () => {
    const unsortedBooked = log({ id: "x", bookings: [OCT6_30] });
    const excludedBooked = log({ ...d, bookings: [OCT6_30] });
    expect(bookedMinutes(f)).toBe(75);
    expect(bookedMinutes(a)).toBe(120);
    expect(bookedMinutes(b)).toBe(0);
    expect(bookedMinutes(unsortedBooked)).toBe(0);
    expect(bookedMinutes(excludedBooked)).toBe(0);
    expect(unbookedMinutes(f)).toBe(60);
    expect(unbookedMinutes(b)).toBe(60);
    expect(unbookedMinutes(e)).toBe(0);
    expect(unbookedMinutes(c)).toBe(0);
    expect(unbookedMinutes(excludedBooked)).toBe(0);

    expect(addBooking([OCT6_30, OCT7_45], "2026-10-07", 60)).toEqual([
      OCT6_30,
      { date: "2026-10-07", minutes: 105 }
    ]);
    expect(addBooking([OCT7_45], "2026-10-06", 30)).toEqual([OCT6_30, OCT7_45]);
    expect(addBooking([], "2026-10-01", 60)).toEqual([OCT1_60]);

    expect(removeBooking([OCT6_30, OCT7_45], "2026-10-06")).toEqual([OCT7_45]);
    expect(removeBooking([OCT7_45], "2026-10-06")).toEqual([OCT7_45]);
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
      entry({
        log: g,
        booking: OCT1_60,
        minutes: 60,
        booked: 60,
        incoming: true
      })
    ]);

    // Non-bookable logs with bookings: an unsorted one booked to another day, an excluded one booked to its own day.
    const unsortedBooked = log({
      id: "x",
      workDate: "2026-10-02",
      bookings: [{ date: "2026-10-03", minutes: 60 }]
    });
    const excludedBooked = log({
      id: "y",
      project: anthropic,
      excludeFromStats: true,
      bookings: [{ date: "2026-10-06", minutes: 60 }]
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
    expect(sixth.bookedTotal).toBe(30);
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
