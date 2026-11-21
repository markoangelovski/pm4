"use client";

import { useSearchParams } from "next/navigation";
import { AuthGuard } from "@/features/auth/components/auth-guard";
import { signInHref } from "@/lib/auth/return-to";

/** D3, D5: `?request=` without `?error=` needs a session (signed out → sign-in, back here); the error page doesn't. Render inside <Suspense>. */
export function ConsentRoute({
  children
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const params = useSearchParams();
  if (params.get("error") !== null || !params.get("request"))
    return <>{children}</>;
  return <AuthGuard signedOutHref={signInHref}>{children}</AuthGuard>;
}
