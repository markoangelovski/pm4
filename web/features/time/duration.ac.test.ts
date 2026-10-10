import { describe, expect, it } from "vitest";
import { parseDurationInput } from "./duration";

const STEP_ERROR = "Use 15-minute steps, from 15 min to 24 h.";

describe("parseDurationInput (feat-tlog-web)", () => {
  it("AC-1 FR-TLOG-010: hours, minutes, h/m and h:mm forms → minutes", () => {
    const cases: [string, number][] = [
      ["0.25", 15],
      ["0,25", 15],
      ["15", 15],
      ["1", 60],
      ["8", 480],
      ["1.5", 90],
      ["45", 45],
      ["90", 90],
      ["1h", 60],
      ["1h 15m", 75],
      ["45m", 45],
      ["1:15", 75],
      ["24h", 1440]
    ];
    for (const [input, minutes] of cases) {
      expect(parseDurationInput(input), input).toEqual({ ok: true, minutes });
    }
  });

  it("AC-2 FR-TLOG-010: off-step, out-of-range and unreadable values → the 15-minute message; empty → Enter a duration.", () => {
    for (const input of ["20", "0.3", "0", "0h", "25h", "1441", "abc", "-15"]) {
      expect(parseDurationInput(input), input).toEqual({
        ok: false,
        error: STEP_ERROR
      });
    }
    expect(parseDurationInput("")).toEqual({
      ok: false,
      error: "Enter a duration."
    });
  });
});
