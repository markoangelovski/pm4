import type { components } from "@/lib/api/schema";

// Typed stubs (feat-int-web). T1 replaces this file with the twin of proto/features/integrations/sync.ts.
type S = components["schemas"];

/** OQ-182: a line for a PMSPA problem, or null to keep the screen's own line. */
export function pmspaProblemText(error: unknown): string | null {
  void error;
  throw new Error("not implemented (feat-int-web)");
}

/** "Synced from PMSPA on 15 October 2026 at 22:50". */
export function syncedLine(
  origin: S["PmspaLinkOrigin"],
  iso: string,
  tz: string
): string {
  void [origin, iso, tz];
  throw new Error("not implemented (feat-int-web)");
}

/** FR-INT-004 status labels. */
export const STATUS_LABEL = {} as Record<S["PmspaConnectionStatus"], string>;

/** True once `active` has lasted 3 s, until it ends. */
export function useSlowPmspa(active: boolean): boolean {
  void active;
  throw new Error("not implemented (feat-int-web)");
}
