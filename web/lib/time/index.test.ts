import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDuration, monthRange, parseDuration, today } from "./index";

const ZAGREB = "Europe/Zagreb";

function setNow(iso: string) {
  vi.setSystemTime(new Date(iso));
}

describe("today", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("flips at local midnight, not UTC midnight (plain winter day)", () => {
    setNow("2026-01-14T22:30:00Z"); // 23:30 CET
    expect(today(ZAGREB)).toBe("2026-01-14");

    setNow("2026-01-14T23:30:00Z"); // 00:30 CET the next day
    expect(today(ZAGREB)).toBe("2026-01-15");
  });

  it("a different time zone can disagree with Zagreb at the same instant", () => {
    setNow("2026-01-14T23:30:00Z");
    expect(today(ZAGREB)).toBe("2026-01-15");
    expect(today("UTC")).toBe("2026-01-14");
  });

  it("crosses midnight correctly the night before the spring-forward switch", () => {
    setNow("2026-03-28T22:30:00Z"); // 23:30 CET
    expect(today(ZAGREB)).toBe("2026-03-28");

    setNow("2026-03-28T23:30:00Z"); // 00:30 CET, next day
    expect(today(ZAGREB)).toBe("2026-03-29");
  });

  it("stays on the same calendar day across the spring-forward instant itself", () => {
    // Europe/Zagreb switches CET -> CEST at 2026-03-29T01:00:00Z (02:00 -> 03:00 local).
    setNow("2026-03-29T00:30:00Z"); // 01:30 CET
    expect(today(ZAGREB)).toBe("2026-03-29");

    setNow("2026-03-29T01:30:00Z"); // 03:30 CEST
    expect(today(ZAGREB)).toBe("2026-03-29");
  });

  it("crosses midnight correctly on the day of the fall-back switch", () => {
    setNow("2026-10-24T21:30:00Z"); // 23:30 CEST
    expect(today(ZAGREB)).toBe("2026-10-24");

    setNow("2026-10-24T22:30:00Z"); // 00:30 CEST, next day
    expect(today(ZAGREB)).toBe("2026-10-25");
  });
});

describe("monthRange", () => {
  it("returns the calendar month bounds, unaffected by DST switches", () => {
    expect(monthRange("2026-03-15", ZAGREB)).toEqual({
      from: "2026-03-01",
      to: "2026-03-31"
    });
    expect(monthRange("2026-10-05", ZAGREB)).toEqual({
      from: "2026-10-01",
      to: "2026-10-31"
    });
  });

  it("handles February in leap and non-leap years", () => {
    expect(monthRange("2026-02-10", ZAGREB)).toEqual({
      from: "2026-02-01",
      to: "2026-02-28"
    });
    expect(monthRange("2028-02-10", ZAGREB)).toEqual({
      from: "2028-02-01",
      to: "2028-02-29"
    });
  });
});

describe("formatDuration", () => {
  it("formats minutes-only, hours-only and mixed durations", () => {
    expect(formatDuration(0)).toBe("0m");
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(75)).toBe("1h 15m");
    expect(formatDuration(125)).toBe("2h 5m");
  });
});

describe("parseDuration", () => {
  it("is not implemented yet", () => {
    expect(() => parseDuration("1h 15m")).toThrow("not implemented (M4)");
  });
});
