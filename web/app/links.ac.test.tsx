import { describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import FullLogo from "./(dashboard-layout)/layout/shared/logo/full-logo";
import SignInPage from "./auth/sign-in/page";
import NotFound from "./not-found";

// next/link applies its own href normalization outside a Next build (next.config isn't loaded in
// Vitest). A plain anchor keeps the exact href the component passes.
vi.mock("next/link", () => ({
  default: ({ href, ...props }: { href: string } & ComponentProps<"a">) => (
    <a href={href} {...props} />
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

describe("Internal links (feat-land-app-route-split)", () => {
  it("AC-10: app logo -> /app, sign-in logo -> /, not-found button -> /", () => {
    const logo = render(<FullLogo />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/app");
    logo.unmount();

    const signIn = render(<SignInPage />);
    expect(screen.getByRole("link", { name: "PM4" })).toHaveAttribute("href", "/");
    signIn.unmount();

    render(<NotFound />);
    expect(screen.getByRole("link", { name: "Go back home" })).toHaveAttribute("href", "/");
  });
});
