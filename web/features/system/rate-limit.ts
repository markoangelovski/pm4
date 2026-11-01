import { toast } from "sonner";
import { isApiError } from "@/lib/api/problem";

/** The one toast for a rate-limited request: a fixed id, so parallel 429s update it instead of stacking. */
export const RATE_LIMIT_TOAST_ID = "rate-limited";

/** True for the API's `429` (`rate-limited`, feat-api-rate-limit). */
export function isRateLimited(error: unknown): boolean {
  return isApiError(error, 429);
}

/** The toast text: "Too many requests. Try again in N seconds." (`retryAfterSeconds` from the body). */
export function rateLimitMessage(error: unknown): string {
  const seconds = isApiError(error) ? error.problem?.retryAfterSeconds : null;
  if (typeof seconds !== "number" || !Number.isInteger(seconds) || seconds < 1)
    return "Too many requests. Try again later.";
  return `Too many requests. Try again in ${seconds} ${seconds === 1 ? "second" : "seconds"}.`;
}

/** Shows (or refreshes) the rate-limit toast when `error` is a 429; returns whether it was one. */
export function notifyRateLimited(error: unknown): boolean {
  if (!isRateLimited(error)) return false;
  toast.error(rateLimitMessage(error), { id: RATE_LIMIT_TOAST_ID });
  return true;
}

/** A screen's failure toast, skipped for a 429: the rate-limit toast already covers it (OQ-256). */
export function toastError(error: unknown, message: string): void {
  if (!isRateLimited(error)) toast.error(message);
}
