import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { routes } from "@/lib/routes";
import { AuthCard, AuthEyebrow, AuthFrame } from "./auth-frame";

const POINTS = [
  "Private to your account",
  "No password to remember",
  "Installs as an app"
];

/**
 * The sign-in page (SCR-001) in the landing page's look (`AuthFrame`): the hero's eyebrow and heading, and one card
 * with the Google button and the legal note (FR-LEGAL-003, OQ-276). The session-dependent parts come in as slots:
 * `state` (the `?error=` alert and the signed-in forward) and `button`.
 */
export function SignInPage({
  state,
  button
}: {
  state: ReactNode;
  button: ReactNode;
}) {
  return (
    <AuthFrame>
      <div className="flex flex-col items-center gap-5 text-center">
        <AuthEyebrow>Projects · Tasks · Time</AuthEyebrow>
        <h1 className="text-4xl leading-[1.05] font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
          Sign in to PM4
        </h1>
        <p className="max-w-sm text-base leading-relaxed text-pretty text-muted-foreground">
          Use your Google account to continue. PM4 never sees or stores a
          password.
        </p>
      </div>

      <AuthCard>
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
      </AuthCard>

      <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        {POINTS.map((p) => (
          <li key={p} className="flex items-center gap-1.5">
            <Check className="size-3.5 text-[var(--lp-booked)]" aria-hidden />
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
    </AuthFrame>
  );
}
