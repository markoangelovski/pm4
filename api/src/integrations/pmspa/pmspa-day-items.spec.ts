import { dayItems } from "./pmspa-day-items.js";
import type { RemoteDay } from "./pmspa-remote.js";

const day = (date: string, logIds: string[]): RemoteDay => ({
  id: `d-${date}`,
  date,
  start: 8.5,
  events: logIds.length
    ? [
        {
          id: `e-${date}`,
          dayId: `d-${date}`,
          date,
          title: "Work",
          taskId: "t1",
          booked: false,
          logs: logIds.map((id) => ({ id, title: "L", duration: 1.5 }))
        }
      ]
    : []
});

describe("dayItems", () => {
  it("newest first, event-less days left out, link state and project title", () => {
    const items = dayItems(
      [
        day("2026-10-12", ["a"]),
        day("2026-10-13", ["b", "c"]),
        day("2026-10-14", [])
      ],
      [{ id: "t1", projectId: "p1", title: "Task" } as never],
      [{ id: "p1", title: "Proj" } as never],
      new Set(["b"])
    );
    expect(items.map((i) => i.date)).toEqual(["2026-10-13", "2026-10-12"]);
    expect(items[0].linkState).toBe("partly-linked");
    expect(items[1].linkState).toBe("not-linked");
    expect(items[0].totalMinutes).toBe(180);
    expect(items[0].startMinute).toBe(510);
    expect(items[0].events[0].task?.projectTitle).toBe("Proj");
  });
});
