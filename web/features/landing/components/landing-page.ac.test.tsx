import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from "@testing-library/react";
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

const SECTIONS = [
  "day",
  "time",
  "bookings",
  "dashboard",
  "projects",
  "notes",
  "integrations",
  "faq"
];
const NAV = ["time", "bookings", "dashboard", "projects", "notes", "faq"];

const ctaSpy = vi.fn<LandingCtaSlot>(() => <span data-testid="cta" />);

function durationInput() {
  return screen.getByRole("textbox", { name: "Duration" });
}

function durationResult() {
  const id = durationInput().getAttribute("aria-describedby");
  return document.getElementById(id!)!;
}

describe("LandingPage (feat-land-page-v2)", () => {
  beforeEach(() => {
    resolvedTheme = "light";
    setTheme.mockReset();
    ctaSpy.mockClear();
    // jsdom has no matchMedia; SmoothScroll reads prefers-reduced-motion.
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("AC-1 FR-LAND-002: the call to action in the header, the hero and the closing section", () => {
    render(<LandingPage cta={ctaSpy} />);
    expect(ctaSpy).toHaveBeenCalledTimes(3);
    expect(ctaSpy.mock.calls.map(([props]) => props)).toEqual([
      { size: "lg" },
      { size: "lg" },
      { size: "lg", variant: "secondary" }
    ]);
    expect(screen.getAllByTestId("cta")).toHaveLength(3);
  });

  it("AC-2 FR-LAND-001: one h1, the eight labelled sections, the section nav, the footer nav and the footer", () => {
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
    expect(hrefs).toEqual(NAV.map((id) => `#${id}`));

    expect(
      screen.getByRole("navigation", { name: "Footer" })
    ).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("AC-3 FR-LAND-001: rendering, the tour, the duration box and the prompt copy make no request", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn(() => Promise.resolve()) }
    });
    render(<LandingPage cta={ctaSpy} />);

    const tour = screen.getByRole("tablist", { name: "PM4 screens" });
    fireEvent.click(within(tour).getByRole("tab", { name: "Bookings" }));
    fireEvent.change(durationInput(), { target: { value: "2h 45m" } });
    fireEvent.click(screen.getByRole("button", { name: "Copy to clipboard" }));
    await screen.findByRole("button", { name: "Copied" });

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

  it("AC-6 FR-LAND-001: the product tour switches between the four screens", () => {
    render(<LandingPage cta={ctaSpy} />);
    const tour = screen.getByRole("tablist", { name: "PM4 screens" });
    const tabs = within(tour).getAllByRole("tab");
    expect(tabs.map((t) => t.textContent!.trim())).toEqual([
      "Logs",
      "Bookings",
      "Statistics",
      "Projects"
    ]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");

    fireEvent.click(tabs[1]);
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    expect(tabs[0]).toHaveAttribute("aria-selected", "false");
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveAttribute("aria-labelledby", tabs[1].id);
    expect(panel.textContent!.trim()).not.toBe("");
  });

  it("AC-7 FR-TLOG-011: the duration box parses sample input like the app's field", () => {
    render(<LandingPage cta={ctaSpy} />);
    expect(durationInput()).toHaveValue("1.5");
    expect(durationResult()).toHaveTextContent("1h 30m");

    fireEvent.change(durationInput(), { target: { value: "20" } });
    expect(durationInput()).toHaveAttribute("aria-invalid", "true");
    expect(durationResult()).toHaveTextContent(
      "Use 15-minute steps, from 15 min to 24 h."
    );

    fireEvent.click(screen.getByRole("button", { name: "1:15" }));
    expect(durationInput()).toHaveValue("1:15");
    expect(durationInput()).toHaveAttribute("aria-invalid", "false");
    expect(durationResult()).toHaveTextContent("1h 15m");
  });

  it("AC-8 FR-LAND-001: the prompt's Copy to clipboard copies the sample prompt", async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>(() =>
      Promise.resolve()
    );
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const { container, unmount } = render(<LandingPage cta={ctaSpy} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy to clipboard" }));
    expect(writeText).toHaveBeenCalledTimes(1);
    const copied = writeText.mock.calls[0][0];
    expect(copied).toMatch(/^Book my time accordingly:\n/);
    // The copied text is the sample prompt the page shows.
    expect(
      Array.from(container.querySelectorAll("pre")).map((p) => p.textContent)
    ).toContain(copied);
    expect(
      await screen.findByRole("button", { name: "Copied" })
    ).toBeInTheDocument();
    unmount();

    const rejected = vi.fn(() => Promise.reject(new Error("denied")));
    vi.stubGlobal("navigator", { clipboard: { writeText: rejected } });
    render(<LandingPage cta={ctaSpy} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy to clipboard" }));
    await waitFor(() => expect(rejected).toHaveBeenCalled());
    await Promise.resolve();
    expect(
      screen.getByRole("button", { name: "Copy to clipboard" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copied" })).toBeNull();
  });
});
