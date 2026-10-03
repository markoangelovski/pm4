import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { LandingCta, LandingCtaFallback } from "./landing-cta";

// next/link applies its own href normalization outside a Next build (next.config isn't loaded in
// Vitest). A plain anchor keeps the exact href the component passes.
vi.mock("next/link", () => ({
  default: ({ href, ...props }: { href: string } & ComponentProps<"a">) => (
    <a href={href} {...props} />
  )
}));

let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => searchParams
}));

describe("LandingCta (feat-land-app-route-split)", () => {
  beforeEach(() => {
    searchParams = new URLSearchParams();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("AC-6 FR-LAND-002: Login href forwards only a valid returnTo (first value wins)", () => {
    const cases: [string, string][] = [
      ["", "/auth/sign-in"],
      [
        "returnTo=%2Fapp%2Fprojects",
        "/auth/sign-in?returnTo=%2Fapp%2Fprojects"
      ],
      ["returnTo=https%3A%2F%2Fevil.example%2F", "/auth/sign-in"],
      ["returnTo=%2Fhome", "/auth/sign-in"],
      [
        "returnTo=%2Fapp%2Ftasks&returnTo=%2Fapp%2Ftrash",
        "/auth/sign-in?returnTo=%2Fapp%2Ftasks"
      ]
    ];
    for (const [query, href] of cases) {
      searchParams = new URLSearchParams(query);
      const { container, unmount } = render(<LandingCta />);
      expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute(
        "href",
        href
      );
      expect(container.innerHTML).not.toContain("evil.example");
      expect(container.innerHTML).not.toContain("home");
      unmount();
    }
  });

  it("AC-7 FR-LAND-002: makes no fetch call and reads localStorage only for pm4.refreshToken (feat-auth-web-session)", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem");
    searchParams = new URLSearchParams("returnTo=%2Fapp");

    render(<LandingCta variant="outline" size="sm" />);

    expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    for (const [key] of getItemSpy.mock.calls) {
      expect(key).toBe("pm4.refreshToken");
    }
  });

  it("AC-8 FR-LAND-002: the fallback is aria-hidden, with no link and no text", () => {
    render(<LandingCtaFallback variant="outline" size="sm" />);

    const placeholder = screen.getByTestId("landing-cta-placeholder");
    expect(placeholder).toHaveAttribute("aria-hidden", "true");
    expect(placeholder.querySelector("a")).toBeNull();
    expect(placeholder.textContent).toBe("");
  });
});

describe("LandingCta signed in (feat-auth-web-session)", () => {
  beforeEach(() => {
    searchParams = new URLSearchParams();
    window.localStorage.clear();
  });

  it("AC-21 FR-LAND-002: with a stored token, Go to app links to a valid returnTo, else /app", () => {
    window.localStorage.setItem("pm4.refreshToken", "R1");
    const cases: [string, string][] = [
      ["", "/app"],
      ["returnTo=%2Fapp%2Fprojects", "/app/projects"],
      ["returnTo=%2Fhome", "/app"]
    ];
    for (const [query, href] of cases) {
      searchParams = new URLSearchParams(query);
      const { unmount } = render(<LandingCta variant="outline" size="sm" />);
      expect(screen.getByRole("link", { name: "Go to app" })).toHaveAttribute(
        "href",
        href
      );
      expect(
        screen.queryByRole("link", { name: "Login" })
      ).not.toBeInTheDocument();
      unmount();
    }
  });
});
