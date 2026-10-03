"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { landingHref } from "@/lib/auth/return-to";
import {
  SessionUnavailableError,
  getAccessToken,
  onSessionEnded
} from "@/lib/auth/session";
import { clearRefreshToken } from "@/lib/auth/token-store";

type GuardState = "checking" | "ready" | "unavailable";

/** Wraps the app shell: renders children only once a session is known (D11). */
export function AuthGuard({
  children
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [state, setState] = useState<GuardState>("checking");
  const [fatal, setFatal] = useState<unknown>(null);

  useEffect(() => {
    if (state !== "checking") return;
    let cancelled = false;
    getAccessToken().then(
      (token) => {
        if (cancelled) return;
        if (token !== null) {
          setState("ready");
          return;
        }
        clearRefreshToken();
        queryClient.clear();
        router.replace(
          landingHref(window.location.pathname + window.location.search)
        );
      },
      (error: unknown) => {
        if (cancelled) return;
        if (error instanceof SessionUnavailableError) {
          setState("unavailable");
          return;
        }
        setFatal(error);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [state, queryClient, router]);

  useEffect(
    () =>
      onSessionEnded(() => {
        queryClient.clear();
        router.replace(
          landingHref(window.location.pathname + window.location.search)
        );
      }),
    [queryClient, router]
  );

  // Unexpected errors surface in the app's error boundary instead of a stuck spinner.
  if (fatal) throw fatal;
  if (state === "ready") return <>{children}</>;
  if (state === "unavailable") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p>Can&apos;t reach PM4 right now.</p>
        <Button onClick={() => setState("checking")}>Retry</Button>
      </div>
    );
  }
  return (
    <div
      role="status"
      aria-label="Loading"
      className="flex min-h-screen items-center justify-center"
    >
      <Spinner className="size-8" />
    </div>
  );
}
