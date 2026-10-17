import { useEffect, useState } from "react";
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

/**
 * OQ-182: a line for a PMSPA problem, or null to keep the screen's own line. A rate limit without
 * `retryAfterSeconds` counts as 15 minutes.
 */
export function pmspaProblemText(error: unknown): string | null {
  if (isApiError(error, 503, "pmspa-rate-limited")) {
    const seconds = error.problem?.retryAfterSeconds;
    const retry = typeof seconds === "number" ? seconds : 900;
    const minutes = Math.max(1, Math.ceil(retry / 60));
    return `PMSPA is busy. Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`;
  }
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
