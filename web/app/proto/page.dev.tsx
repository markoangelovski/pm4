import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  LandingPage,
  type LandingCtaSlot
} from "@/proto/features/landing/components/landing-page";
import { routes } from "@/proto/lib/routes";

export const metadata: Metadata = {
  title: "PM4 — Projects, tasks and time tracking"
};

/** The prototype is always signed in, so the call to action is "Go to app" (FR-LAND-002). */
const protoCta: LandingCtaSlot = ({ variant, size }) => (
  <Link
    href={routes.app.dashboard}
    className={buttonVariants({ variant, size })}
  >
    Go to app
  </Link>
);

/** Twin of `app/page.tsx`: the public landing page (SCR-003). */
export default function ProtoLandingPage() {
  return <LandingPage cta={protoCta} />;
}
