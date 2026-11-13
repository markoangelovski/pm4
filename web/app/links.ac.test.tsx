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
  )
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/"
}));

describe("Internal links (feat-land-app-route-split)", () => {
  it("AC-10: app logo -> /app, sign-in logo -> /, not-found button -> /", () => {
    const logo = render(<FullLogo />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/app");
    logo.unmount();

    const signIn = render(<SignInPage />);
    expect(screen.getByRole("link", { name: "PM4" })).toHaveAttribute(
      "href",
      "/"
    );
    signIn.unmount();

    render(<NotFound />);
    expect(screen.getByRole("link", { name: "Go back home" })).toHaveAttribute(
      "href",
      "/"
    );
  });
});

describe("Sign-in legal note (feat-acct-web)", () => {
  it("AC-4 FR-LEGAL-003: the sign-in page links the terms and the privacy policy", () => {
    render(<SignInPage />);

    expect(
      screen.getByText(
        (_, el) =>
          el?.tagName === "P" &&
          el.textContent ===
            "By continuing, you agree to the Terms and acknowledge the Privacy policy."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute(
      "href",
      "/terms"
    );
    expect(
      screen.getByRole("link", { name: "Privacy policy" })
    ).toHaveAttribute("href", "/privacy");
  });
});
