import { describe, expect, it } from "vitest";
import { formatWorkDate } from "./index";

describe("formatWorkDate (feat-tsk-web)", () => {
  it("AC-2 FR-TSK-008: a work date as a short date, no time zone involved", () => {
    expect(formatWorkDate("2026-10-03")).toBe("3 Oct 2026");
    expect(formatWorkDate("2026-01-31")).toBe("31 Jan 2026");
  });
});
