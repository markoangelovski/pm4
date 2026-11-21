import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { LandingThemeToggle } from "@/features/landing/components/landing-theme-toggle";
import { routes } from "@/lib/routes";

/** The landing page's hero colours (features/landing), for the backdrop and the eyebrow dot. */
const HERO_VARS =
  "[--lp-worked:#2a78d6] [--lp-booked:#1baf7a] dark:[--lp-worked:#3987e5] dark:[--lp-booked:#199e70]";

const POINTS = [
  "Private to your account",
  "No password to remember",
  "Installs as an app"
];

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
 * The sign-in page (SCR-001) in the landing page's look: its header and footer, the hero's backdrop, eyebrow and
 * heading, and one card with the Google button and the legal note (FR-LEGAL-003, OQ-276). The session-dependent
 * parts come in as slots: `state` (the `?error=` alert and the signed-in forward) and `button`.
 */
export function SignInPage({
  state,
  button
}: {
  state: ReactNode;
  button: ReactNode;
}) {
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
          <div className="flex flex-col items-center gap-5 text-center">
            <p className="flex w-fit items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium">
              <span
                aria-hidden
                className="size-2 rounded-full bg-[var(--lp-booked)]"
              />
              Projects · Tasks · Time
            </p>
            <h1 className="text-4xl leading-[1.05] font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
              Sign in to PM4
            </h1>
            <p className="max-w-sm text-base leading-relaxed text-pretty text-muted-foreground">
              Use your Google account to continue. PM4 never sees or stores a
              password.
            </p>
          </div>

          <div className="flex w-full flex-col gap-5 rounded-2xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur sm:p-8">
            {state}
            {button}
            {/* FR-LEGAL-003, OQ-276 */}
            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              By continuing, you agree to the{" "}
              <Link
                href={routes.terms}
                className="font-medium text-foreground underline underline-offset-4"
              >
                Terms
              </Link>{" "}
              and acknowledge the{" "}
              <Link
                href={routes.privacy}
                className="font-medium text-foreground underline underline-offset-4"
              >
                Privacy policy
              </Link>
              .
            </p>
          </div>

          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-1.5">
                <Check
                  className="size-3.5 text-[var(--lp-booked)]"
                  aria-hidden
                />
                {p}
              </li>
            ))}
          </ul>

          <Link
            href={routes.landing}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Back to home
          </Link>
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
