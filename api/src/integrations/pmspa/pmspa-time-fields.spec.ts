import { describe, expect, it } from "vitest";
import { startToMinute } from "./pmspa-time-fields.js";

describe("startToMinute", () => {
  it("clamps a start after 23:45 to 1425 (OQ-194)", () => {
    expect(startToMinute(23.9)).toBe(1425);
    expect(startToMinute(23.75)).toBe(1425);
    expect(startToMinute(24)).toBe(1425);
  });

  it("rounds to the nearest 15 minutes below the clamp", () => {
    expect(startToMinute(23.5)).toBe(1410);
    expect(startToMinute(9.25)).toBe(555);
  });
});
