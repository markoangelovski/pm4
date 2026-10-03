import { describe, expect, it } from "vitest";
import { completionPercent, taskCount } from "./stats";

const counts = (completed: number, total: number) => ({
  upcoming: total - completed,
  inProgress: 0,
  completed,
  total
});

describe("project statistics (feat-prj-web)", () => {
  it("AC-3 FR-PRJ-008: completed % rounds to a whole number, 0 without tasks; taskCount maps in-progress", () => {
    expect(completionPercent(counts(1, 4))).toBe(25);
    expect(completionPercent(counts(2, 3))).toBe(67);
    expect(completionPercent(counts(0, 0))).toBe(0);

    const stats = { upcoming: 3, inProgress: 1, completed: 4, total: 8 };
    expect(taskCount(stats, "in-progress")).toBe(1);
    expect(taskCount(stats, "upcoming")).toBe(3);
    expect(taskCount(stats, "completed")).toBe(4);
  });
});
