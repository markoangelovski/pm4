import type { Metadata } from "next";
import { Suspense } from "react";
import {
  LandingCta,
  LandingCtaFallback
} from "@/app/components/shared/landing-cta";
import {
  LandingPage,
  type LandingCtaSlot
} from "@/features/landing/components/landing-page";

export const metadata: Metadata = {
  title: "PM4 — Projects, tasks and time tracking"
};

/** "Go to app" / "Login" (FR-LAND-002); reads `?returnTo=`, so it renders inside <Suspense> with a same-size fallback. */
const cta: LandingCtaSlot = ({ variant, size }) => (
  <Suspense fallback={<LandingCtaFallback variant={variant} size={size} />}>
    <LandingCta variant={variant} size={size} />
  </Suspense>
);

/** Public landing page (SCR-003, FR-LAND-001/002). Outside the app shell and its auth guard. */
export default function Page() {
  return <LandingPage cta={cta} />;
}
