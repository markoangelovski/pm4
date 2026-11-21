"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Ban,
  Check,
  CircleAlert,
  Clock,
  Laptop,
  Link2,
  ShieldAlert
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { isApiError } from "@/lib/api/problem";
import { formatDate } from "@/lib/time";
import { toastError } from "@/proto/features/system/rate-limit";
import { useSignOut } from "@/proto/features/auth/use-sign-out";
import { useMe } from "@/proto/features/users/api";
import { routes } from "@/proto/lib/routes";
import {
  AuthCard,
  AuthEyebrow
} from "@/proto/features/auth/components/auth-frame";
import {
  useAllowConsent,
  useConsentRequest,
  useDenyConsent,
  type ConsentRequest
} from "../api";
import type { ConsentErrorCode } from "../proposed-types";
import { scopeLines } from "../scopes";
import { AppMark } from "./app-mark";

/**
 * The consent page (FR-MCP-005) inside `AuthFrame`: `?request=<id>` shows the pending authorization request with
 * Allow / Deny; `?error=` (sent by the API for an untrusted client or redirect, FR-MCP-003/004) or an unknown request
 * shows the error page. The page's guard has already signed the user in (signed out → sign-in → back here).
 */
export function ConsentPage() {
  const params = useSearchParams();
  const error = params.get("error");
  const requestId = params.get("request");
  if (error !== null || !requestId)
    return <ConsentError code={error as ConsentErrorCode | null} />;
  return <ConsentRequestView requestId={requestId} />;
}

function ConsentRequestView({ requestId }: { requestId: string }) {
  const {
    data: request,
    isPending,
    isError,
    error,
    refetch
  } = useConsentRequest(requestId);
  const expired = useExpired(request?.expiresAt);
  const [gone, setGone] = useState(false);

  if (isError && !request) {
    if (isApiError(error, 404)) return <ConsentError code={null} />;
    return (
      <AuthCard>
        <p className="text-sm">Couldn&apos;t load this request.</p>
        <Button
          variant="outline"
          className="w-fit cursor-pointer"
          onClick={() => refetch()}
        >
          Retry
        </Button>
      </AuthCard>
    );
  }
  if (isPending || !request) return <ConsentSkeleton />;
  if (expired || gone) return <ConsentExpired request={request} />;
  return <ConsentForm request={request} onExpired={() => setGone(true)} />;
}

/** True once `expiresAt` has passed; flips by itself at that moment. */
function useExpired(expiresAt: string | undefined): boolean {
  const [now, setNow] = useState(() => Date.now());
  const at = expiresAt ? Date.parse(expiresAt) : null;
  useEffect(() => {
    if (at === null || at <= Date.now()) return;
    const timer = setTimeout(() => setNow(Date.now()), at - Date.now() + 50);
    return () => clearTimeout(timer);
  }, [at]);
  return at !== null && at <= now;
}

function Heading({ title, lead }: { title: string; lead?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <AuthEyebrow>Connect an app</AuthEyebrow>
      <h1 className="text-3xl leading-[1.1] font-semibold tracking-[-0.03em] text-balance [overflow-wrap:anywhere] sm:text-4xl">
        {title}
      </h1>
      {lead && (
        <p className="max-w-sm text-base leading-relaxed text-pretty text-muted-foreground">
          {lead}
        </p>
      )}
    </div>
  );
}

function ConsentForm({
  request,
  onExpired
}: {
  request: ConsentRequest;
  onExpired: () => void;
}) {
  const allow = useAllowConsent();
  const deny = useDenyConsent();
  const [leaving, setLeaving] = useState(false);
  const busy = allow.isPending || deny.isPending || leaving;

  const answer = (mutation: typeof allow) =>
    mutation.mutate(request.id, {
      onSuccess: ({ redirectUrl }) => {
        setLeaving(true);
        window.location.assign(redirectUrl);
      },
      onError: (e) => {
        if (isApiError(e, 410)) onExpired();
        else toastError(e, "Couldn't send your answer. Try again.");
      }
    });

  return (
    <>
      <Heading
        title={`Allow ${request.client.name} to use your PM4 account?`}
      />
      <AuthCard>
        <AccountRow requestId={request.id} />

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">App</dt>
          <dd className="flex min-w-0 items-center gap-2 font-medium">
            <AppMark name={request.client.name} className="size-5" />
            <span className="[overflow-wrap:anywhere]">
              {request.client.name}
            </span>
          </dd>
          <dt className="text-muted-foreground">From</dt>
          <dd className="font-mono text-xs leading-5 [overflow-wrap:anywhere]">
            {request.client.clientIdHost}
          </dd>
          <dt className="text-muted-foreground">Returns to</dt>
          <dd className="font-mono text-xs leading-5 [overflow-wrap:anywhere]">
            {request.redirectHost}
          </dd>
        </dl>

        {request.loopback && (
          <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 *:[svg]:text-current">
            <Laptop aria-hidden />
            <AlertTitle>This app runs on this computer</AlertTitle>
            <AlertDescription className="text-current/80">
              It returns to {request.redirectHost} on this device. Allow it only
              if you just started it yourself.
            </AlertDescription>
          </Alert>
        )}

        {request.existingGrant && (
          <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
            <Link2
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <span>
              Already connected since{" "}
              <ConnectedDate iso={request.existingGrant.connectedAt} />.
              Allowing again replaces its access.
            </span>
          </p>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">It will be able to:</p>
          <ul className="flex flex-col gap-2 text-sm">
            {scopeLines(request.scopes).map((line) => (
              <li key={line} className="flex items-start gap-2">
                <Check
                  className="mt-0.5 size-4 shrink-0 text-[var(--lp-booked)]"
                  aria-hidden
                />
                {line}
              </li>
            ))}
            <li className="flex items-start gap-2 text-muted-foreground">
              <Ban className="mt-0.5 size-4 shrink-0" aria-hidden />
              It can&apos;t delete anything.
            </li>
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            size="lg"
            className="cursor-pointer"
            disabled={busy}
            onClick={() => answer(deny)}
          >
            {deny.isPending && <Spinner />}
            Deny
          </Button>
          <Button
            size="lg"
            className="cursor-pointer"
            disabled={busy}
            onClick={() => answer(allow)}
          >
            {allow.isPending && <Spinner />}
            Allow
          </Button>
        </div>

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          {leaving
            ? `Returning you to ${request.client.name}…`
            : "You can disconnect it at any time in Settings → Connected apps."}
        </p>
      </AuthCard>
    </>
  );
}

/** The signed-in PM4 account (FR-MCP-005: which account is signing in). */
function AccountRow({ requestId }: { requestId: string }) {
  const { data: me } = useMe();
  // Sign out, then Google sign-in brings the user back to this request.
  const switchAccount = useSignOut(
    `${routes.signIn}?returnTo=${encodeURIComponent(
      `${routes.consent}?request=${encodeURIComponent(requestId)}`
    )}`
  );
  if (!me)
    return (
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-44" />
        </div>
      </div>
    );
  const initials = me.displayName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border px-3 py-2.5">
      <Avatar className="size-9">
        {me.avatarUrl && <AvatarImage src={me.avatarUrl} alt="" />}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium">{me.displayName}</span>
        <span className="truncate text-xs text-muted-foreground">
          {me.email}
        </span>
        <button
          type="button"
          className="mt-1 w-fit cursor-pointer text-xs font-medium underline underline-offset-4 hover:text-foreground"
          onClick={() => void switchAccount()}
        >
          Use another account
        </button>
      </div>
    </div>
  );
}

function ConnectedDate({ iso }: { iso: string }) {
  const { data: me } = useMe();
  return (
    <span className="font-medium">
      {formatDate(iso, me?.timeZone ?? "UTC")}
    </span>
  );
}

/** FR-MCP-005: the request expired, so there's no Allow. */
function ConsentExpired({ request }: { request: ConsentRequest }) {
  return (
    <>
      <Heading
        title="This request has expired"
        lead={`Go back to ${request.client.name} and connect again. Nothing was shared.`}
      />
      <AuthCard>
        <p className="flex items-start gap-2 text-sm">
          <Clock
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <span>
            {request.client.name} ({request.client.clientIdHost}) asked for
            access, but the request is no longer valid.
          </span>
        </p>
        <Button
          variant="outline"
          className="cursor-pointer"
          render={<Link href={routes.app.dashboard} />}
        >
          Open PM4
        </Button>
      </AuthCard>
    </>
  );
}

const ERRORS: Record<
  ConsentErrorCode | "unknown",
  { title: string; text: string }
> = {
  invalid_client: {
    title: "PM4 couldn't verify this app",
    text: "The app's details couldn't be loaded or aren't valid, so PM4 can't tell who is asking. Nothing was shared. Try again later, or contact the app's developer."
  },
  invalid_redirect_uri: {
    title: "This app asked to return somewhere it isn't allowed to",
    text: "For your safety, PM4 didn't send you back to it. Nothing was shared. Contact the app's developer."
  },
  unknown: {
    title: "This request isn't valid",
    text: "The link is incomplete or was already used. Go back to the app and connect again. Nothing was shared."
  }
};

/** FR-MCP-003/004: an untrusted client or redirect, or an unknown request: never redirects to the app. */
function ConsentError({ code }: { code: ConsentErrorCode | null }) {
  const e = (code && ERRORS[code]) ?? ERRORS.unknown;
  const Icon = code === "invalid_redirect_uri" ? ShieldAlert : CircleAlert;
  return (
    <>
      <Heading title={e.title} />
      <AuthCard>
        <p className="flex items-start gap-2 text-sm leading-relaxed">
          <Icon
            className="mt-0.5 size-4 shrink-0 text-destructive"
            aria-hidden
          />
          {e.text}
        </p>
        <Button
          variant="outline"
          className="cursor-pointer"
          render={<Link href={routes.app.dashboard} />}
        >
          Open PM4
        </Button>
      </AuthCard>
    </>
  );
}

function ConsentSkeleton() {
  return (
    <>
      <div className="flex w-full flex-col items-center gap-5">
        <Skeleton className="h-6 w-32 rounded-full" />
        <Skeleton className="h-10 w-full max-w-xs" />
      </div>
      <AuthCard>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      </AuthCard>
    </>
  );
}
