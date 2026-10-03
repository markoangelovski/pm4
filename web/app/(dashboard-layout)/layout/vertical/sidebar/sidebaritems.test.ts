import { describe, expect, it } from "vitest";
import sidebaritems, { footerItems } from "./sidebaritems";

describe("sidebaritems", () => {
  it("has the sections, names and order from routing.md", () => {
    expect(
      sidebaritems.map((s) => [s.heading, s.items?.map((i) => i.name)])
    ).toEqual([
      ["Dashboard", ["Default"]],
      ["Project management", ["Projects", "Tasks"]],
      ["Time", ["Logs"]]
    ]);
    expect(footerItems).toHaveLength(1);
    expect(footerItems[0].heading).toBeUndefined();
    expect(footerItems[0].items?.map((i) => i.name)).toEqual([
      "Trash",
      "Settings"
    ]);
  });

  it("gives every item of both exports a url and an icon", () => {
    const items = [...sidebaritems, ...footerItems].flatMap(
      (section) => section.items ?? []
    );

    for (const item of items) {
      expect(item.url).toBeTruthy();
      expect(item.icon).toBeDefined();
    }
  });
});
