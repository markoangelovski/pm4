import { describe, expect, it } from "vitest";
import sidebaritems from "./sidebaritems";

describe("sidebaritems", () => {
  it("matches the PM4 navigation list and order from routing.md", () => {
    const names = sidebaritems.flatMap(
      (section) => section.items?.map((item) => item.name) ?? []
    );

    expect(names).toEqual([
      "Dashboard",
      "Time",
      "Projects",
      "Tasks",
      "Trash",
      "Settings"
    ]);
  });

  it("gives every item a url and an icon", () => {
    const items = sidebaritems.flatMap((section) => section.items ?? []);

    for (const item of items) {
      expect(item.url).toBeTruthy();
      expect(item.icon).toBeDefined();
    }
  });
});
