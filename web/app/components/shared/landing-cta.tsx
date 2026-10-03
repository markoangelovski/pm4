"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  RETURN_TO_PARAM,
  postSignInPath,
  signInHref
} from "@/lib/auth/return-to";
import { useHasStoredSession } from "@/lib/auth/token-store";

type ButtonProps = ComponentProps<typeof Button>;

export interface LandingCtaProps {
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}

/** Login link (or "Go to app" when signed in) that forwards a valid `?returnTo=` (FR-LAND-002). Render inside <Suspense>. */
export function LandingCta({
  variant,
  size
}: LandingCtaProps): React.JSX.Element {
  const searchParams = useSearchParams();
  const raw = searchParams.get(RETURN_TO_PARAM);
  const signedIn = useHasStoredSession();

  if (signedIn === null) {
    return <LandingCtaFallback variant={variant} size={size} />;
  }
  if (signedIn) {
    return (
      <Link
        href={postSignInPath(raw)}
        className={buttonVariants({ variant, size })}
      >
        Go to app
      </Link>
    );
  }
  const href = signInHref(raw);

  return (
    <Link href={href} className={buttonVariants({ variant, size })}>
      Login
    </Link>
  );
}

/** Neutral, same-size placeholder shown until the CTA is known (Suspense fallback). */
export function LandingCtaFallback({
  variant,
  size
}: LandingCtaProps): React.JSX.Element {
  return (
    <Skeleton
      aria-hidden="true"
      data-testid="landing-cta-placeholder"
      className={cn(
        buttonVariants({ variant, size }),
        "w-24 border-transparent bg-muted text-transparent"
      )}
    />
  );
}
