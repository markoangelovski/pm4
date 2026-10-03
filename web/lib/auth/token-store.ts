export const REFRESH_TOKEN_KEY = "pm4.refreshToken";

/** null when absent, empty or storage throws. */
export function getRefreshToken(): string | null {
  throw new Error("not implemented (feat-auth-web-session)");
}

/** Never throws. */
export function setRefreshToken(token: string): void {
  throw new Error("not implemented (feat-auth-web-session)");
}

/** Never throws. */
export function clearRefreshToken(): void {
  throw new Error("not implemented (feat-auth-web-session)");
}

/** Calls `listener` on local set/clear and on `storage` events for the key (other tabs). Returns an unsubscribe. */
export function subscribe(listener: () => void): () => void {
  throw new Error("not implemented (feat-auth-web-session)");
}

/** Only `storage` events from other tabs where the key's new value is null (D3). Returns an unsubscribe. */
export function onRemovedElsewhere(listener: () => void): () => void {
  throw new Error("not implemented (feat-auth-web-session)");
}

/** true/false on the client; null during prerender and hydration (useSyncExternalStore server snapshot). */
export function useHasStoredSession(): boolean | null {
  throw new Error("not implemented (feat-auth-web-session)");
}
