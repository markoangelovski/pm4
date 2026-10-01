import { describe, expect, it } from "vitest";
import SidebarContent from "./sidebaritems";

describe("Sidebar items (feat-land-app-route-split)", () => {
  it("AC-9: sidebar URLs are under /app, in the existing order", () => {
    const items = SidebarContent.flatMap((section) => section.items ?? []);
    expect(items.map((item) => [item.id, item.url])).toEqual([
      ["dashboard", "/app"],
      ["time", "/app/time"],
      ["projects", "/app/projects"],
      ["tasks", "/app/tasks"],
      ["trash", "/app/trash"],
      ["settings", "/app/settings"],
    ]);
  });
});
