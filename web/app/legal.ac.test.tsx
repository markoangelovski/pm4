import { afterEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import PrivacyPage from "./privacy/page";
import TermsPage from "./terms/page";

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

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn() })
}));

const hrefs = () =>
  screen.getAllByRole("link").map((a) => a.getAttribute("href"));

describe("Legal pages (feat-acct-web)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("AC-1 FR-LEGAL-001: the privacy policy names the controller's address, the processors and AZOP, and links the terms and home", () => {
    render(<PrivacyPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Privacy policy" })
    ).toBeInTheDocument();
    expect(hrefs()).toContain("mailto:pm4@angelovski.top");
    const text = document.body.textContent ?? "";
    for (const name of [
      "Google",
      "Microsoft",
      "Neon",
      "Redis",
      "GitHub",
      "AZOP"
    ]) {
      expect(text, name).toContain(name);
    }
    expect(hrefs()).toContain("/terms");
    expect(hrefs()).toContain("/");
  });

  it("AC-2 FR-LEGAL-002: the terms of service link the privacy policy and home", () => {
    render(<TermsPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Terms of service" })
    ).toBeInTheDocument();
    expect(hrefs()).toContain("/privacy");
    expect(hrefs()).toContain("/");
  });

  it("AC-3 FR-LEGAL-001: either page renders without a request, a query client or a session", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    // No QueryClientProvider and no session: a query or an auth read would throw or fetch.
    const privacy = render(<PrivacyPage />);
    privacy.unmount();
    render(<TermsPage />);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
