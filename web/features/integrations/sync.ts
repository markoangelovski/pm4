import { useEffect, useState, useSyncExternalStore } from "react";
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { isApiError } from "@/lib/api/problem";
import type { PmspaConnectionStatus, PmspaLinkOrigin } from "./types";

/** FR-INT-010: "15 October 2026 at 22:50" in `tz`. */
export function formatSyncedAt(iso: string, tz: string): string {
  return format(new TZDate(iso, tz), "d MMMM yyyy 'at' HH:mm");
}

/** The app's short date (lists, tags): "15 Oct 2026" in `tz`. */
export function formatSyncedDate(iso: string, tz: string): string {
  return format(new TZDate(iso, tz), "d MMM yyyy");
}

/** OQ-164: which way the link was made, from PM4's side. */
export const ORIGIN_LABEL: Record<PmspaLinkOrigin, string> = {
  imported: "Synced from PMSPA",
  pushed: "Synced to PMSPA",
  linked: "Synced with PMSPA"
};

/** "Synced from PMSPA on 15 October 2026 at 22:50". */
export function syncedLine(
  origin: PmspaLinkOrigin,
  iso: string,
  tz: string
): string {
  return `${ORIGIN_LABEL[origin]} on ${formatSyncedAt(iso, tz)}`;
}

/** The PMSPA clock's tick. */
export const PMSPA_TICK_MS = 15_000;

let pmspaNow = Date.now();
const pmspaNowListeners = new Set<() => void>();
let pmspaNowTimer: ReturnType<typeof setInterval> | undefined;

function subscribePmspaNow(listener: () => void): () => void {
  if (pmspaNowListeners.size === 0) {
    pmspaNow = Date.now();
    pmspaNowTimer = setInterval(() => {
      pmspaNow = Date.now();
      pmspaNowListeners.forEach((l) => l());
    }, PMSPA_TICK_MS);
  }
  pmspaNowListeners.add(listener);
  return () => {
    pmspaNowListeners.delete(listener);
    if (pmspaNowListeners.size === 0) clearInterval(pmspaNowTimer);
  };
}

function pmspaNowSnapshot(): number {
  if (
    pmspaNowListeners.size === 0 &&
    Math.abs(Date.now() - pmspaNow) >= PMSPA_TICK_MS
  )
    pmspaNow = Date.now();
  return pmspaNow;
}

/**
 * Now, updated every `PMSPA_TICK_MS` by one clock shared by every PMSPA countdown (the requests line and the
 * "PMSPA is busy" lines), so they all show the same minutes.
 */
export function usePmspaNow(): number {
  return useSyncExternalStore(
    subscribePmspaNow,
    pmspaNowSnapshot,
    pmspaNowSnapshot
  );
}

/** Whole minutes from `now` until `at`, at least 1. */
export function minutesUntil(at: number, now: number): number {
  return Math.max(1, Math.ceil((at - now) / 60_000));
}

/** "PMSPA is busy. Try again in N minutes." */
export function pmspaBusyText(minutes: number): string {
  return `PMSPA is busy. Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`;
}

/** A 503 `pmspa-rate-limited`'s `retryAfterSeconds`, 15 minutes without; null for any other error. */
export function pmspaRetryAfterSeconds(error: unknown): number | null {
  if (!isApiError(error, 503, "pmspa-rate-limited")) return null;
  const seconds = error.problem?.retryAfterSeconds;
  return typeof seconds === "number" ? seconds : 900;
}

/**
 * OQ-182: a line for a PMSPA problem, or null to keep the screen's own line. A rate limit without
 * `retryAfterSeconds` counts as 15 minutes.
 */
export function pmspaProblemText(error: unknown): string | null {
  const retry = pmspaRetryAfterSeconds(error);
  if (retry !== null) return pmspaBusyText(Math.max(1, Math.ceil(retry / 60)));
  if (isApiError(error, 409, "pmspa-sync-running")) {
    return "Another import, sync or push is still running.";
  }
  if (isApiError(error, 409, "pmspa-invalid-credentials")) {
    return "PMSPA rejected the saved email or password.";
  }
  if (isApiError(error, 502, "pmspa-unreachable")) {
    return "PMSPA couldn't be reached.";
  }
  return null;
}

/** FR-INT-004 status labels. */
export const STATUS_LABEL: Record<PmspaConnectionStatus, string> = {
  "not-configured": "Not configured",
  connected: "Connected",
  "invalid-credentials": "Invalid credentials",
  unreachable: "Unreachable"
};

/** After this long, a PMSPA call is probably a cold start (OQ-165). */
export const SLOW_PMSPA_MS = 3000;

/** True once `active` has lasted `SLOW_PMSPA_MS`, until it ends. */
export function useSlowPmspa(active: boolean): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => setSlow(true), SLOW_PMSPA_MS);
    return () => {
      clearTimeout(id);
      setSlow(false);
    };
  }, [active]);
  return active && slow;
}
