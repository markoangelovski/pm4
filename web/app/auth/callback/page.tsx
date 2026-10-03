import { Suspense } from "react";
import type { Metadata } from "next";
import { Spinner } from "@/components/ui/spinner";
import { AuthCallback } from "@/features/auth/components/auth-callback";

export const metadata: Metadata = {
  title: "Signing in"
};

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-3">
          <Spinner className="size-8" />
          <p className="text-sm text-muted-foreground">Signing in…</p>
        </div>
      }
    >
      <AuthCallback />
    </Suspense>
  );
}
