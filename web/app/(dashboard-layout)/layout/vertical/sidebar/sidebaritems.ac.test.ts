import { describe, expect, it } from "vitest";
import { ChartColumn, NotebookPen } from "lucide-react";
import SidebarContent, { footerItems, type MenuItem } from "./sidebaritems";

const shape = (menu: MenuItem[]) =>
  menu.map((section) => [
    section.heading,
    (section.items ?? []).map((item) => [item.id, item.name, item.url])
  ]);

describe("Sidebar items (feat-shell-sidebar-sections, feat-proto-sync-logged-chart, feat-note-todos)", () => {
  it("AC-1 OQ-054 (feat-book-web AC-12, feat-note-todos AC-16): the default export is grouped into Dashboard, Project management and Time; Project management lists Projects, Tasks, Notes; Time lists Logs, then Bookings", () => {
    expect(shape(SidebarContent)).toEqual([
      ["Dashboard", [["dashboard", "Statistics", "/app"]]],
      [
        "Project management",
        [
          ["projects", "Projects", "/app/projects"],
          ["tasks", "Tasks", "/app/tasks"],
          ["notes", "Notes", "/app/notes"]
        ]
      ],
      [
        "Time",
        [
          ["time", "Logs", "/app/time"],
          ["bookings", "Bookings", "/app/bookings"]
        ]
      ]
    ]);
  });

  it("AC-2 OQ-054: footerItems is one section without a heading: Settings only", () => {
    expect(footerItems).toHaveLength(1);
    expect(footerItems[0].heading).toBeUndefined();
    expect(shape(footerItems)).toEqual([
      [undefined, [["settings", "Settings", "/app/settings"]]]
    ]);
  });

  it("AC-3 OQ-054 (feat-book-web AC-12, feat-note-todos AC-16): both exports together link every app route exactly once", () => {
    const urls = [...SidebarContent, ...footerItems]
      .flatMap((section) => section.items ?? [])
      .map((item) => item.url);
    expect([...urls].sort()).toEqual(
      [
        "/app",
        "/app/projects",
        "/app/tasks",
        "/app/notes",
        "/app/time",
        "/app/bookings",
        "/app/settings"
      ].sort()
    );
  });

  it("AC-16 FR-NOTE-001 SCR-070: Project management lists Projects, Tasks, then Notes → /app/notes with the NotebookPen icon", () => {
    const pm = SidebarContent.find((s) => s.heading === "Project management");
    expect(pm?.items?.map((i) => [i.id, i.name, i.url])).toEqual([
      ["projects", "Projects", "/app/projects"],
      ["tasks", "Tasks", "/app/tasks"],
      ["notes", "Notes", "/app/notes"]
    ]);
    expect(pm?.items?.[2].icon).toBe(NotebookPen);
  });

  it("AC-8 SCR-010: the Dashboard section holds Statistics → /app with the ChartColumn icon", () => {
    const dashboard = SidebarContent.find((s) => s.heading === "Dashboard");
    expect(dashboard?.items?.map((i) => [i.id, i.name, i.url])).toEqual([
      ["dashboard", "Statistics", "/app"]
    ]);
    expect(dashboard?.items?.[0].icon).toBe(ChartColumn);
  });
});
