import { describe, expect, it } from "vitest";
import { dueState } from "./due";

const today = "2026-10-03";

describe("dueState (feat-tsk-web)", () => {
  it("AC-1 FR-TSK-008: overdue before today, due soon today or tomorrow; completed or no date → no badge", () => {
    expect(dueState("2026-10-02", "upcoming", today)).toBe("overdue");
    expect(dueState("2026-10-03", "upcoming", today)).toBe("due-soon");
    expect(dueState("2026-10-04", "in-progress", today)).toBe("due-soon");
    expect(dueState("2026-10-05", "upcoming", today)).toBeNull();
    expect(dueState(null, "upcoming", today)).toBeNull();
    expect(dueState("2026-10-02", "completed", today)).toBeNull();
    // Tomorrow across a month end.
    expect(dueState("2026-11-01", "upcoming", "2026-10-31")).toBe("due-soon");
  });
});
