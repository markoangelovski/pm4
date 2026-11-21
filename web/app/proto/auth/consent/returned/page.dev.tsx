import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthFrame } from "@/proto/features/auth/components/auth-frame";
import { MockConsentReturned } from "@/proto/mock/shell/mock-consent";

export const metadata: Metadata = {
  title: "Returned to the app"
};

/** Prototype only: where Allow / Deny would send the browser (no production twin). */
export default function ProtoConsentReturnedPage() {
  return (
    <AuthFrame>
      <Suspense fallback={null}>
        <MockConsentReturned />
      </Suspense>
    </AuthFrame>
  );
}
