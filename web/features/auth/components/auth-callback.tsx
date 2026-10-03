"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import {
  RETURN_TO_PARAM,
  postSignInPath,
  sanitizeReturnTo
} from "@/lib/auth/return-to";
import { exchangeLoginCode } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

/** Exchanges the login code once (D13), then forwards to the returnTo. Render inside <Suspense>. */
export function AuthCallback(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const returnTo = searchParams.get(RETURN_TO_PARAM);

  useEffect(() => {
    let cancelled = false;
    const fail = () => {
      const params = new URLSearchParams({ error: "failed" });
      const safe = sanitizeReturnTo(returnTo);
      if (safe !== null) params.set(RETURN_TO_PARAM, safe);
      router.replace(`${routes.signIn}?${params.toString()}`);
    };
    if (!code) {
      fail();
      return;
    }
    exchangeLoginCode(code).then(
      () => {
        if (!cancelled) router.replace(postSignInPath(returnTo));
      },
      () => {
        if (!cancelled) fail();
      }
    );
    return () => {
      cancelled = true;
    };
  }, [code, returnTo, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <Spinner className="size-8" />
      <p className="text-sm text-muted-foreground">Signing in…</p>
    </div>
  );
}
