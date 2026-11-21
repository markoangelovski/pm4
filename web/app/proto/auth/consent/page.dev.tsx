import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthFrame } from "@/proto/features/auth/components/auth-frame";
import { ConsentPage } from "@/proto/features/agents/components/consent-page";
import {
  MockConsentGate,
  MockConsentSwitch
} from "@/proto/mock/shell/mock-consent";

export const metadata: Metadata = {
  title: "Connect an app"
};

/**
 * Twin of `app/auth/consent/page.tsx` (FR-MCP-005): `?request=<id>` or `?error=`. States: the switcher at the bottom
 * (seed.ts `seedConsentRequests`).
 */
export default function ProtoConsentPage() {
  return (
    <AuthFrame>
      <Suspense fallback={null}>
        <MockConsentGate>
          <ConsentPage />
        </MockConsentGate>
        <MockConsentSwitch />
      </Suspense>
    </AuthFrame>
  );
}
