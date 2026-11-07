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

const description =
  "PM4 keeps your projects and tasks in one place, logs your day in 15-minute blocks with a note on each, helps you book the time, and shows where the month went.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  title: "PM4 — Projects, tasks and time tracking",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "PM4",
    title: "PM4 — Every hour, accounted for.",
    description,
    images: [
      {
        url: "/images/og/pm4-card.png",
        width: 1200,
        height: 630,
        alt: "PM4: Every hour, accounted for."
      }
    ]
  }
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
