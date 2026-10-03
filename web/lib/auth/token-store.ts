import { useSyncExternalStore } from "react";

export const REFRESH_TOKEN_KEY = "pm4.refreshToken";

/** Listeners for changes made in this tab (storage events only reach other tabs). */
const localListeners = new Set<() => void>();

function notifyLocal(): void {
  for (const listener of [...localListeners]) listener();
}

/** null when absent, empty or storage throws. */
export function getRefreshToken(): string | null {
  try {
    const value = window.localStorage.getItem(REFRESH_TOKEN_KEY);
    return value ? value : null;
  } catch {
    return null;
  }
}

/** Never throws. */
export function setRefreshToken(token: string): void {
  try {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } catch {
    // A throwing storage behaves as empty (D5).
  }
  notifyLocal();
}

/** Never throws. */
export function clearRefreshToken(): void {
  try {
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // A throwing storage behaves as empty (D5).
  }
  notifyLocal();
}

/** Calls `listener` on local set/clear and on `storage` events for the key (other tabs). Returns an unsubscribe. */
export function subscribe(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === REFRESH_TOKEN_KEY) listener();
  };
  const local = () => listener();
  localListeners.add(local);
  window.addEventListener("storage", onStorage);
  return () => {
    localListeners.delete(local);
    window.removeEventListener("storage", onStorage);
  };
}

/** Only `storage` events from other tabs where the key's new value is null (D3). Returns an unsubscribe. */
export function onRemovedElsewhere(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === REFRESH_TOKEN_KEY && event.newValue === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

function hasStoredSession(): boolean {
  return getRefreshToken() !== null;
}

function serverSnapshot(): null {
  return null;
}

/** true/false on the client; null during prerender and hydration (useSyncExternalStore server snapshot). */
export function useHasStoredSession(): boolean | null {
  return useSyncExternalStore<boolean | null>(
    subscribe,
    hasStoredSession,
    serverSnapshot
  );
}
