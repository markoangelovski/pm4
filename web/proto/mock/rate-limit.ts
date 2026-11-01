// The prototype shell's "API rate limit" switch: while a window is set, every mock API request answers
// 429 `rate-limited` (conventions.md#errors), with `retryAfterSeconds` counting down to the window's end.

let limitedUntil: number | null = null;

/** Turns every API request away for `seconds` from now; null lifts the limit. */
export function forceApiRateLimit(seconds: number | null): void {
  limitedUntil = seconds === null ? null : Date.now() + seconds * 1000;
}

/** Seconds left in the forced window (≥ 1), or 0 when requests go through. */
export function apiRetryAfterSeconds(): number {
  if (limitedUntil === null) return 0;
  const left = Math.ceil((limitedUntil - Date.now()) / 1000);
  if (left > 0) return left;
  limitedUntil = null;
  return 0;
}

/** The API's 429 body and header (API-wide limit, feat-api-rate-limit). */
export function rateLimitedResponse(retryAfterSeconds: number): Response {
  return new Response(
    JSON.stringify({
      type: "https://pm4.angelovski.top/errors/rate-limited",
      title: "Too Many Requests",
      status: 429,
      detail: "Too many requests. Try again later.",
      retryAfterSeconds
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/problem+json",
        "Retry-After": String(retryAfterSeconds)
      }
    }
  );
}
