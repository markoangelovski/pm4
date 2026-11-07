import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import Page, { metadata } from "./page";

vi.mock("next/font/google", () => ({
  Geist_Mono: () => ({ variable: "font-geist-mono" })
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

function ctaHrefs(name: string) {
  return screen
    .getAllByRole("link", { name })
    .map((a) => a.getAttribute("href"));
}

describe("Landing page / (feat-land-redesign)", () => {
  beforeEach(() => {
    searchParams = new URLSearchParams();
    window.localStorage.clear();
  });

  it("AC-5 FR-LAND-002: signed out, the three calls to action are Login and forward a valid returnTo", () => {
    const { unmount } = render(<Page />);
    expect(ctaHrefs("Login")).toEqual(Array(3).fill("/auth/sign-in"));
    expect(screen.queryByRole("link", { name: "Go to app" })).toBeNull();
    unmount();

    searchParams = new URLSearchParams("returnTo=%2Fapp%2Fprojects");
    render(<Page />);
    expect(ctaHrefs("Login")).toEqual(
      Array(3).fill("/auth/sign-in?returnTo=%2Fapp%2Fprojects")
    );
  });

  it("AC-6 FR-LAND-002: signed in, the three calls to action are Go to app and open a valid returnTo", () => {
    window.localStorage.setItem("pm4.refreshToken", "R1");
    const { unmount } = render(<Page />);
    expect(ctaHrefs("Go to app")).toEqual(Array(3).fill("/app"));
    expect(screen.queryByRole("link", { name: "Login" })).toBeNull();
    unmount();

    searchParams = new URLSearchParams("returnTo=%2Fapp%2Fprojects");
    render(<Page />);
    expect(ctaHrefs("Go to app")).toEqual(Array(3).fill("/app/projects"));
  });

  it("AC-7: the page title is unchanged", () => {
    expect(metadata.title).toBe("PM4 — Projects, tasks and time tracking");
  });
});
