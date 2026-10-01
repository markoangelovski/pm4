"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";

type ButtonProps = ComponentProps<typeof Button>;

export interface LandingCtaProps {
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}

/** Login link that forwards a valid `?returnTo=` (FR-LAND-002). Render inside <Suspense>. */
export function LandingCta(props: LandingCtaProps): React.JSX.Element {
  void props;
  throw new Error("not implemented (feat-land-app-route-split)");
}

/** Neutral, same-size placeholder shown until the CTA is known (Suspense fallback). */
export function LandingCtaFallback(props: LandingCtaProps): React.JSX.Element {
  void props;
  throw new Error("not implemented (feat-land-app-route-split)");
}
