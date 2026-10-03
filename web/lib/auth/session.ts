/** The API couldn't be reached (D1). */
export class SessionUnavailableError extends Error {}

/** A valid access token: the cached one (D6) or a fresh refresh. null = no session (no stored token, or the refresh was rejected). Throws SessionUnavailableError. */
export function getAccessToken(): Promise<string | null> {
  throw new Error("not implemented (feat-auth-web-session)");
}

/** Always refreshes (single-flight, D7). Same results as getAccessToken. */
export function refreshAccessToken(): Promise<string | null> {
  throw new Error("not implemented (feat-auth-web-session)");
}

/** API-AUTH-003. Stores the refresh token and caches the access token. Throws on any failure (nothing stored). */
export function exchangeLoginCode(code: string): Promise<void> {
  throw new Error("not implemented (feat-auth-web-session)");
}

/** API-AUTH-005 with the stored token (errors ignored), then clears the stored and cached tokens. Never throws. */
export function signOut(): Promise<void> {
  throw new Error("not implemented (feat-auth-web-session)");
}

/** Called when a session ends without a user sign-out: a rejected refresh, or removal by another tab (D3). */
export function onSessionEnded(listener: () => void): () => void {
  throw new Error("not implemented (feat-auth-web-session)");
}

/** `${NEXT_PUBLIC_API_BASE_URL}/api/v1/auth/google` with `returnTo` (only if sanitizeReturnTo accepts it) then `timeZone` (the browser zone), URLSearchParams-encoded. */
export function googleSignInUrl(returnTo: string | null): string {
  throw new Error("not implemented (feat-auth-web-session)");
}

/** Test helper: resets the cached token, the in-flight promise and the code map. */
export function resetSessionForTests(): void {
  throw new Error("not implemented (feat-auth-web-session)");
}
