import { afterEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import NavCollapse from "./index";
import SidebarContent, { footerItems } from "../sidebaritems";

const nav = vi.hoisted(() => ({
  pathname: "/app",
  state: "expanded" as "expanded" | "collapsed"
}));

// A plain anchor keeps the exact href (next.config isn't loaded in Vitest).
vi.mock("next/link", () => ({
  default: ({ href, ...props }: { href: string } & ComponentProps<"a">) => (
    <a href={href} {...props} />
  )
}));

vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname
}));

vi.mock("@/components/ui/sidebar", () => ({
  useSidebar: () => ({ state: nav.state })
}));

afterEach(() => {
  nav.pathname = "/app";
  nav.state = "expanded";
});

describe("NavCollapse sections (feat-shell-sidebar-sections, feat-proto-sync-logged-chart, feat-shell-documentation)", () => {
  it("AC-4 OQ-054 (feat-proto-sync-logged-chart AC-8): expanded, the default export shows the three headings and the four links", () => {
    render(<NavCollapse menu={SidebarContent} />);
    for (const heading of ["Dashboard", "Project management", "Time"]) {
      expect(screen.getByText(heading)).toBeInTheDocument();
    }
    for (const name of ["Statistics", "Projects", "Tasks", "Logs"]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
  });

  it("AC-5 OQ-054: footerItems render no heading element, and no ... when collapsed; the default export shows ... 3 times", () => {
    const expanded = render(<NavCollapse menu={footerItems} />);
    expect(expanded.container.querySelector("span.uppercase")).toBeNull();
    expanded.unmount();

    nav.state = "collapsed";
    const collapsed = render(<NavCollapse menu={footerItems} />);
    expect(collapsed.container.querySelector("span.uppercase")).toBeNull();
    expect(screen.queryAllByText("...")).toHaveLength(0);
    collapsed.unmount();

    render(<NavCollapse menu={SidebarContent} />);
    expect(screen.getAllByText("...")).toHaveLength(3);
  });

  it("AC-6 OQ-054 (feat-shell-documentation AC-13 SCR-053): at /app/settings the footer links Settings, then Documentation, and only Settings is active", () => {
    nav.pathname = "/app/settings";
    render(<NavCollapse menu={footerItems} />);
    const settings = screen.getByRole("link", { name: "Settings" });
    const documentation = screen.getByRole("link", { name: "Documentation" });
    expect(screen.getAllByRole("link")).toEqual([settings, documentation]);
    expect(settings).toHaveAttribute("href", "/app/settings");
    expect(documentation).toHaveAttribute("href", "/app/documentation");
    expect(settings.querySelector(".bg-primary")).not.toBeNull();
    expect(documentation.querySelector(".bg-primary")).toBeNull();
  });
});
