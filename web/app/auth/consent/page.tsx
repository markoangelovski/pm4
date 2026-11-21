import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthFrame } from "@/features/auth/components/auth-frame";
import { ConsentPage } from "@/features/agents/components/consent-page";
import { ConsentRoute } from "@/features/agents/components/consent-route";
import { RateLimitNotifier } from "@/features/system/components/rate-limit-notifier";

export const metadata: Metadata = {
  title: "Connect an app"
};

/** The consent page (SCR-090, FR-MCP-005): `?request=<id>` or `?error=`. */
export default function ConsentRoutePage() {
  return (
    <Suspense fallback={null}>
      <ConsentRoute>
        <AuthFrame>
          <ConsentPage />
        </AuthFrame>
      </ConsentRoute>
      <RateLimitNotifier />
    </Suspense>
  );
}
