import { describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import Footer from "./footer";

// next/link applies its own href normalization outside a Next build (next.config isn't loaded in
// Vitest). A plain anchor keeps the exact href the component passes.
vi.mock("next/link", () => ({
  default: ({ href, ...props }: { href: string } & ComponentProps<"a">) => (
    <a href={href} {...props} />
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

  it("should have exactly three links with correct hrefs and no target attribute", () => {
    render(<Footer />);

    const links = screen.getAllByRole("link");

    // AC: Exactly three links
    expect(links).toHaveLength(3);

    // Check the links and their hrefs
    const linkMap = links.map((link) => ({
      text: link.textContent,
      href: link.getAttribute("href"),
      target: link.getAttribute("target")
    }));

    expect(linkMap).toContainEqual({
      text: "PM4",
      href: "/",
      target: null
    });

    expect(linkMap).toContainEqual({
      text: "Terms and Conditions",
      href: "/terms-and-conditions",
      target: null
    });

    expect(linkMap).toContainEqual({
      text: "Privacy",
      href: "/privacy",
      target: null
    });

    // AC: None of the links have a target attribute
    links.forEach((link) => {
      expect(link).not.toHaveAttribute("target");
    });
  });
});
