import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { LandingCta } from "./components/shared/landing-cta";
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

const mentionsNativeButton = (spy: ReturnType<typeof vi.spyOn>) =>
  spy.mock.calls.some((args: unknown[]) =>
    args.some((a: unknown) => String(a).includes("nativeButton"))
  );

describe("links styled as buttons (no Base UI nativeButton warning)", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("LandingCta renders a link and no nativeButton warning", () => {
    render(<LandingCta />);
    expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();
    expect(mentionsNativeButton(errorSpy)).toBe(false);
    expect(mentionsNativeButton(warnSpy)).toBe(false);
  });

  it("NotFound renders a link and no nativeButton warning", () => {
    render(<NotFound />);
    expect(
      screen.getByRole("link", { name: "Go back home" })
    ).toBeInTheDocument();
    expect(mentionsNativeButton(errorSpy)).toBe(false);
    expect(mentionsNativeButton(warnSpy)).toBe(false);
  });
});
