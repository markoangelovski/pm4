import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthCallback } from "@/features/auth/components/auth-callback";
import { LoadingMark } from "@/features/auth/components/loading-mark";

export const metadata: Metadata = {
  title: "Signing in"
};

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          className="flex min-h-screen flex-col items-center justify-center gap-3"
        >
          <LoadingMark />
          <p className="text-sm text-muted-foreground">Signing in…</p>
        </div>
      }
    >
      <AuthCallback />
    </Suspense>
  );
}
