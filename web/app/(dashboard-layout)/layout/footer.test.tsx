import { describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import Footer from "./footer";

// next/link applies its own href normalization outside a Next build (next.config isn't loaded in
// Vitest). A plain anchor keeps the exact href the component passes, and exposes `prefetch` as a
// data attribute so the test can check it.
vi.mock("next/link", () => ({
  default: ({
    href,
    prefetch,
    ...props
  }: { href: string; prefetch?: boolean } & ComponentProps<"a">) => (
    <a href={href} data-prefetch={String(prefetch)} {...props} />
  )
}));

describe("Footer", () => {
  it("should display copyright text and links", () => {
    render(<Footer />);

    // AC: The test finds the paragraph text with normalized text content
    const paragraphs = screen.getAllByRole("paragraph");
    const copyrightParagraph = paragraphs.find((p) =>
      p.textContent
        ?.replace(/\s+/g, " ")
        .includes("© 2026 by PM4, better project management for you")
    );

    expect(copyrightParagraph).toBeDefined();
    const normalizedText =
      copyrightParagraph?.textContent?.replace(/\s+/g, " ") ?? "";
    expect(normalizedText).toContain("© 2026 by");
    expect(normalizedText).toContain("PM4");
    expect(normalizedText).toContain("better project management for you");
  });

  it("should have exactly one link to the landing page, without a target attribute", () => {
    render(<Footer />);

    const links = screen.getAllByRole("link");

    // AC: Exactly one link: PM4 → /
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent("PM4");
    expect(links[0]).toHaveAttribute("href", "/");

    // AC: The link has no target attribute
    expect(links[0]).not.toHaveAttribute("target");

    // The footer is on every page: its link must not prefetch on each navigation
    expect(links[0]).toHaveAttribute("data-prefetch", "false");
  });
});
