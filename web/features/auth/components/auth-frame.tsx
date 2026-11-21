import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { LandingThemeToggle } from "@/features/landing/components/landing-theme-toggle";
import { routes } from "@/lib/routes";

/** The landing page's hero colours (features/landing), for the backdrop and the eyebrow dot. */
const HERO_VARS =
  "[--lp-worked:#2a78d6] [--lp-booked:#1baf7a] dark:[--lp-worked:#3987e5] dark:[--lp-booked:#199e70]";

function Logo() {
  return (
    <Link
      href={routes.landing}
      className="flex items-center gap-2"
      aria-label="PM4"
    >
      <Image
        src="/images/logos/logoicon.svg"
        alt=""
        width={28}
        height={28}
        className="size-7"
      />
      <span className="text-base font-semibold tracking-tight">PM4</span>
    </Link>
  );
}

/**
 * The standalone auth pages' frame in the landing page's look: its header and footer, the hero's backdrop, and a
 * centred column for the page's content. Used by the sign-in page (SCR-001) and the consent page (FR-MCP-005).
 */
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className={`flex min-h-screen flex-col bg-background text-foreground ${HERO_VARS}`}
    >
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <LandingThemeToggle />
        </div>
      </header>

      <main className="relative flex flex-1 flex-col overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(60rem_28rem_at_50%_-8rem,color-mix(in_oklab,var(--lp-worked)_22%,transparent),transparent),radial-gradient(40rem_24rem_at_85%_0,color-mix(in_oklab,var(--lp-booked)_16%,transparent),transparent)]"
        />
        <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-8 px-4 py-16 sm:px-6 sm:py-24">
          {children}
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm text-muted-foreground">
            Projects, tasks and time tracking.
          </p>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  href={routes.privacy}
                  className="transition-colors hover:text-foreground"
                >
                  Privacy
                </Link>
              </li>
              <li>
                <Link
                  href={routes.terms}
                  className="transition-colors hover:text-foreground"
                >
                  Terms
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/** The hero's eyebrow pill above a page heading. */
export function AuthEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="flex w-fit items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium">
      <span aria-hidden className="size-2 rounded-full bg-[var(--lp-booked)]" />
      {children}
    </p>
  );
}

/** The frame's card: the page's main block. */
export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-5 rounded-2xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur sm:p-8">
      {children}
    </div>
  );
}
