import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { LandingPage, type LandingCtaSlot } from "./landing-page";

vi.mock("next/font/google", () => ({
  Geist_Mono: () => ({ variable: "font-geist-mono" })
}));

// next/link applies its own href normalization outside a Next build (next.config isn't loaded in
// Vitest). A plain anchor keeps the exact href the component passes.
vi.mock("next/link", () => ({
  default: ({ href, ...props }: { href: string } & ComponentProps<"a">) => (
    <a href={href} {...props} />
  )
}));

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

let resolvedTheme = "light";
const setTheme = vi.fn();

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme, setTheme })
}));

const SECTIONS = ["time", "bookings", "dashboard", "projects", "notes"];

const ctaSpy = vi.fn<LandingCtaSlot>(() => <span data-testid="cta" />);

describe("LandingPage (feat-land-redesign)", () => {
  beforeEach(() => {
    resolvedTheme = "light";
    setTheme.mockReset();
    ctaSpy.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("AC-1 FR-LAND-002: the call to action in the header, the hero and the closing section", () => {
    render(<LandingPage cta={ctaSpy} />);
    expect(ctaSpy).toHaveBeenCalledTimes(3);
    expect(ctaSpy.mock.calls.map(([props]) => props)).toEqual([
      { variant: "outline", size: "sm" },
      { size: "lg" },
      { size: "lg" }
    ]);
    expect(screen.getAllByTestId("cta")).toHaveLength(3);
  });

  it("AC-2 FR-LAND-001: one h1, the five labelled sections, the section nav and the footer", () => {
    const { container } = render(<LandingPage cta={ctaSpy} />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);

    for (const id of SECTIONS) {
      const section = container.querySelector(`section#${id}`);
      expect(section, `section #${id}`).not.toBeNull();
      const labelId = section!.getAttribute("aria-labelledby");
      expect(labelId, `#${id} aria-labelledby`).toBeTruthy();
      const label = container.querySelector(`[id="${labelId}"]`);
      expect(label?.tagName, `#${id} label`).toMatch(/^H[1-6]$/);
      expect(label!.textContent!.trim()).not.toBe("");
    }

    const nav = screen.getByRole("navigation", { name: "Sections" });
    const hrefs = within(nav)
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(SECTIONS.map((id) => `#${id}`));

    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("AC-3 FR-LAND-001: rendering the page makes no request", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<LandingPage cta={ctaSpy} />);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("AC-4 FR-LAND-001: the header's theme switch toggles light and dark", () => {
    const { unmount } = render(<LandingPage cta={ctaSpy} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Switch to dark mode" })
    );
    expect(setTheme).toHaveBeenCalledWith("dark");
    unmount();

    resolvedTheme = "dark";
    setTheme.mockReset();
    render(<LandingPage cta={ctaSpy} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Switch to light mode" })
    );
    expect(setTheme).toHaveBeenCalledWith("light");
  });

  it("AC-5 FR-LEGAL-003 (feat-acct-web): the footer links Privacy and Terms", () => {
    render(<LandingPage cta={ctaSpy} />);
    const footer = screen.getByRole("contentinfo");

    expect(
      within(footer).getByRole("link", { name: "Privacy" })
    ).toHaveAttribute("href", "/privacy");
    expect(within(footer).getByRole("link", { name: "Terms" })).toHaveAttribute(
      "href",
      "/terms"
    );
  });
});
