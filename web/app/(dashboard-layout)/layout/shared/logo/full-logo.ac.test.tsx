import { describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import FullLogo from "./full-logo";

// A plain anchor keeps the exact href (next.config isn't loaded in Vitest).
vi.mock("next/link", () => ({
  default: ({ href, ...props }: { href: string } & ComponentProps<"a">) => (
    <a href={href} {...props} />
  )
}));

// A plain img keeps the exact src (no image loader in Vitest).
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    ...props
  }: { src: string; alt: string } & ComponentProps<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  )
}));

describe("FullLogo (feat-shell-sidebar-branding)", () => {
  it("AC-9 SCR-004: one link to /app named PM4, the title, the subtitle and the logo icon", () => {
    const { container } = render(<FullLogo />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(screen.getByRole("link", { name: "PM4" })).toHaveAttribute(
      "href",
      "/app"
    );
    expect(screen.getByText("PM4")).toBeInTheDocument();
    expect(screen.getByText("Project management")).toBeInTheDocument();
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      "/images/logos/logoicon.svg"
    );
  });

  it("AC-10 SCR-004: compact keeps the single link and the icon, without title or subtitle text", () => {
    const { container } = render(<FullLogo compact />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "PM4" })).toHaveAttribute(
      "href",
      "/app"
    );
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      "/images/logos/logoicon.svg"
    );
    expect(screen.queryByText("PM4")).toBeNull();
    expect(screen.queryByText("Project management")).toBeNull();
  });
});
