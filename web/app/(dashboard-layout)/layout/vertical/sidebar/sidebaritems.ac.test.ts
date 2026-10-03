import { describe, expect, it } from "vitest";
import SidebarContent, { footerItems, type MenuItem } from "./sidebaritems";

const shape = (menu: MenuItem[]) =>
  menu.map((section) => [
    section.heading,
    (section.items ?? []).map((item) => [item.id, item.name, item.url])
  ]);

describe("Sidebar items (feat-shell-sidebar-sections)", () => {
  it("AC-1 OQ-054: the default export is grouped into Dashboard, Project management and Time", () => {
    expect(shape(SidebarContent)).toEqual([
      ["Dashboard", [["dashboard", "Default", "/app"]]],
      [
        "Project management",
        [
          ["projects", "Projects", "/app/projects"],
          ["tasks", "Tasks", "/app/tasks"]
        ]
      ],
      ["Time", [["time", "Logs", "/app/time"]]]
    ]);
  });

  it("AC-2 OQ-054: footerItems is one section without a heading: Trash, then Settings", () => {
    expect(footerItems).toHaveLength(1);
    expect(footerItems[0].heading).toBeUndefined();
    expect(shape(footerItems)).toEqual([
      [
        undefined,
        [
          ["trash", "Trash", "/app/trash"],
          ["settings", "Settings", "/app/settings"]
        ]
      ]
    ]);
  });

  it("AC-3 OQ-054: both exports together link every app route exactly once", () => {
    const urls = [...SidebarContent, ...footerItems]
      .flatMap((section) => section.items ?? [])
      .map((item) => item.url);
    expect([...urls].sort()).toEqual(
      [
        "/app",
        "/app/projects",
        "/app/tasks",
        "/app/time",
        "/app/trash",
        "/app/settings"
      ].sort()
    );
  });
});
