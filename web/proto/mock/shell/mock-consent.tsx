"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { routes } from "@/proto/lib/routes";

/** The consent page's states (seed.ts `seedConsentRequests`, plus the API's `?error=` and the signed-out path). */
const STATES = [
  { label: "Normal (write)", query: "request=normal" },
  { label: "Read only", query: "request=read-only" },
  { label: "Loopback", query: "request=loopback" },
  { label: "Already connected", query: "request=connected" },
  { label: "Expired", query: "request=expired" },
  { label: "Invalid client", query: "error=invalid_client" },
  { label: "Invalid redirect", query: "error=invalid_redirect_uri" },
  { label: "Unknown request", query: "request=nope" },
  { label: "Signed out", query: "request=normal&mock=signed-out" }
];

/**
 * Prototype stand-in for the consent page's session guard (never promoted). `?mock=signed-out` acts as a signed-out
 * visitor: it goes to the sign-in twin with `returnTo` = this page, whose button brings it back here signed in.
 * The production guard does this with the real session; the `?error=` page needs no sign-in.
 */
export function MockConsentGate({ children }: { children: ReactNode }) {
  const params = useSearchParams();
  const router = useRouter();
  const signedOut =
    params.get("mock") === "signed-out" && params.get("error") === null;
  useEffect(() => {
    if (!signedOut) return;
    const back = new URLSearchParams(params);
    back.delete("mock");
    const returnTo = `${routes.consent}?${back.toString()}`;
    router.replace(`${routes.signIn}?returnTo=${encodeURIComponent(returnTo)}`);
  }, [signedOut, params, router]);
  return signedOut ? null : children;
}

/** A floating bar to switch between the consent page's states. */
export function MockConsentSwitch() {
  const params = useSearchParams();
  const current = params.toString();
  return (
    <nav
      aria-label="Prototype states"
      className="fixed inset-x-2 bottom-2 z-50 mx-auto flex max-w-fit flex-wrap items-center justify-center gap-1 rounded-xl border border-dashed border-amber-500/60 bg-background/95 p-1.5 text-xs shadow-lg backdrop-blur"
    >
      <span className="px-1.5 font-medium text-amber-700 dark:text-amber-300">
        Mock
      </span>
      {STATES.map((s) => (
        <Link
          key={s.query}
          href={`${routes.consent}?${s.query}`}
          className={cn(
            "rounded-md px-2 py-1 transition-colors hover:bg-muted",
            current === s.query && "bg-muted font-medium"
          )}
        >
          {s.label}
        </Link>
      ))}
    </nav>
  );
}

/** Where Allow / Deny would send the browser: the app's redirect URI (the mock never leaves PM4). */
export function MockConsentReturned() {
  const to = useSearchParams().get("to") ?? "";
  let url: URL | null = null;
  try {
    url = new URL(to);
  } catch {
    url = null;
  }
  const denied = url?.searchParams.get("error") === "access_denied";
  return (
    <div className="flex w-full flex-col gap-4 rounded-2xl border border-dashed border-amber-500/60 bg-card/80 p-6 text-sm">
      <p className="font-medium text-amber-700 dark:text-amber-300">
        Prototype: the browser now leaves PM4
      </p>
      <p>
        {denied
          ? "The app receives error=access_denied. No grant was created."
          : "The app receives a one-time code and its state, and shows in Settings → Connected apps."}
      </p>
      <code className="rounded-md bg-muted px-2 py-1.5 text-xs [overflow-wrap:anywhere]">
        {to}
      </code>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <Link
          href={`${routes.app.settings}?tab=connected-apps`}
          className="font-medium underline underline-offset-4"
        >
          Settings → Connected apps
        </Link>
        <Link
          href={`${routes.consent}?request=normal`}
          className="font-medium underline underline-offset-4"
        >
          Back to the consent page
        </Link>
      </div>
    </div>
  );
}
