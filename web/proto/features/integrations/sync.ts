import { useEffect, useState } from "react";
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import type { PmspaConnectionStatus, PmspaLinkOrigin } from "./proposed-types";

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
