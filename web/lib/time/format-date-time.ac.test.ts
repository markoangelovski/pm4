import { describe, expect, it } from "vitest";
import { formatDateTime, formatShortDate } from "./index";

describe("formatShortDate and formatDateTime (feat-prj-dates-lead-search)", () => {
  it("AC-7 SCR-020 SCR-021: an instant as a short date, and as a date and time, in the given time zone", () => {
    expect(formatShortDate("2026-10-02T22:30:00.000Z", "Europe/Zagreb")).toBe(
      "3 Oct 2026"
    );
    expect(formatShortDate("2026-10-02T22:30:00.000Z", "UTC")).toBe(
      "2 Oct 2026"
    );
    expect(formatDateTime("2026-10-02T22:30:00.000Z", "Europe/Zagreb")).toBe(
      "3 October 2026, 00:30"
    );
    // Winter time (CET, UTC+1).
    expect(formatDateTime("2026-01-15T12:05:00.000Z", "Europe/Zagreb")).toBe(
      "15 January 2026, 13:05"
    );
  });
});
