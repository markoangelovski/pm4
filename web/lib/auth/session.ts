import createClient from "openapi-fetch";
import type { paths } from "@/lib/api/schema";
import { RETURN_TO_PARAM, sanitizeReturnTo } from "@/lib/auth/return-to";
import {
  clearRefreshToken,
  getRefreshToken,
  onRemovedElsewhere,
  setRefreshToken
} from "@/lib/auth/token-store";

/** The API couldn't be reached (D1). */
export class SessionUnavailableError extends Error {
  constructor(
    message = "The PM4 API couldn't be reached",
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "SessionUnavailableError";
  }
}

/** Cross-tab lock name for refreshes (D7). */
const REFRESH_LOCK = "pm4-auth-refresh";
/** The cached access token is reused until this long before it expires (D6). */
const EXPIRY_MARGIN_MS = 30_000;

/**
 * Unauthenticated client for the public auth endpoints (D8): `client.ts` imports this module, so
 * this one must not import `apiClient`.
 */
const authClient = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL
});

type TokenPair = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
};

type CachedAccessToken = { token: string; expiresAt: number };

/** Memory only, per tab (D6, ADR-0007). */
let cached: CachedAccessToken | null = null;
/** The refresh in progress in this tab (single-flight, D7). */
let inFlight: Promise<string | null> | null = null;
/** Bumped whenever the session ends, so a refresh that finishes afterwards stores nothing. */
let generation = 0;
/** Login codes already exchanged on this page load (D13): each code is single use. */
const exchanges = new Map<string, Promise<void>>();
const endedListeners = new Set<() => void>();

function notifySessionEnded(): void {
  for (const listener of [...endedListeners]) listener();
}

function cache(pair: TokenPair): void {
  const expiresAt = Date.parse(pair.accessTokenExpiresAt);
  cached = Number.isNaN(expiresAt)
    ? null
    : { token: pair.accessToken, expiresAt };
}

function validCachedToken(): string | null {
  if (cached === null) return null;
  if (Date.now() >= cached.expiresAt - EXPIRY_MARGIN_MS) return null;
  return cached.token;
}

/** Runs `task` inside the cross-tab refresh lock when the browser has one (D7). */
function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  const locks =
    typeof navigator !== "undefined"
      ? (navigator as Navigator & { locks?: LockManager }).locks
      : undefined;
  if (!locks || typeof locks.request !== "function") return task();
  return locks.request(REFRESH_LOCK, () => task()) as Promise<T>;
}

/** One refresh, inside the lock: the stored token is read here, after any other tab rotated it. */
async function refreshInsideLock(): Promise<string | null> {
  const startedIn = generation;
  const refreshToken = getRefreshToken();
  if (refreshToken === null) return null;

  const { data, response } = await authClient
    .POST("/api/v1/auth/refresh", { body: { refreshToken } })
    .catch((error: unknown) => {
      throw new SessionUnavailableError(undefined, { cause: error });
    });
  if (response.status === 200 && data) {
    if (generation !== startedIn) return null;
    setRefreshToken(data.refreshToken);
    cache(data);
    return data.accessToken;
  }
  if (response.status === 401 || response.status === 400) {
    clearRefreshToken();
    cached = null;
    generation++;
    notifySessionEnded();
    return null;
  }
  // 5xx, 429 or anything else unexpected: the session may still be valid (D1).
  throw new SessionUnavailableError(
    `Refreshing the session failed with status ${response.status}`
  );
}

/** A valid access token: the cached one (D6) or a fresh refresh. null = no session (no stored token, or the refresh was rejected). Throws SessionUnavailableError. */
export async function getAccessToken(): Promise<string | null> {
  const token = validCachedToken();
  if (token !== null) return token;
  return refreshAccessToken();
}

/** Always refreshes (single-flight, D7). Same results as getAccessToken. */
export function refreshAccessToken(): Promise<string | null> {
  if (inFlight) return inFlight;
  const promise = withRefreshLock(refreshInsideLock).finally(() => {
    if (inFlight === promise) inFlight = null;
  });
  inFlight = promise;
  return promise;
}

async function exchange(code: string): Promise<void> {
  const { data, response } = await authClient.POST("/api/v1/auth/token", {
    body: { code }
  });
  if (response.status !== 200 || !data) {
    throw new Error(
      `Exchanging the login code failed with status ${response.status}`
    );
  }
  setRefreshToken(data.refreshToken);
  cache(data);
}

/** API-AUTH-003. Stores the refresh token and caches the access token. Throws on any failure (nothing stored). */
export function exchangeLoginCode(code: string): Promise<void> {
  const existing = exchanges.get(code);
  if (existing) return existing;
  const promise = exchange(code);
  exchanges.set(code, promise);
  return promise;
}

/** API-AUTH-005 with the stored token (errors ignored), then clears the stored and cached tokens. Never throws. */
export async function signOut(): Promise<void> {
  const refreshToken = getRefreshToken();
  generation++;
  cached = null;
  if (refreshToken !== null) {
    try {
      await authClient.POST("/api/v1/auth/logout", { body: { refreshToken } });
    } catch {
      // The local sign-out happens whatever the API says.
    }
  }
  clearRefreshToken();
  // Again after the await: a refresh that started during the logout request captured the
  // generation bumped above, so bump once more to make it store nothing when it finishes.
  generation++;
  cached = null;
}

/** Called when a session ends without a user sign-out: a rejected refresh, or removal by another tab (D3). */
export function onSessionEnded(listener: () => void): () => void {
  const entry = () => listener();
  endedListeners.add(entry);
  return () => {
    endedListeners.delete(entry);
  };
}

function browserTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/** `${NEXT_PUBLIC_API_BASE_URL}/api/v1/auth/google` with `returnTo` (only if sanitizeReturnTo accepts it) then `timeZone` (the browser zone), URLSearchParams-encoded. */
export function googleSignInUrl(returnTo: string | null): string {
  const params = new URLSearchParams();
  const safe = sanitizeReturnTo(returnTo);
  if (safe !== null) params.set(RETURN_TO_PARAM, safe);
  const timeZone = browserTimeZone();
  if (timeZone !== null) params.set("timeZone", timeZone);
  const query = params.toString();
  const base = `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ""}/api/v1/auth/google`;
  return query ? `${base}?${query}` : base;
}

/** Test helper: resets the cached token, the in-flight promise and the code map. */
export function resetSessionForTests(): void {
  cached = null;
  inFlight = null;
  generation++;
  exchanges.clear();
}

// Another tab signed out (or its session ended): end this tab's session too (D3).
onRemovedElsewhere(() => {
  cached = null;
  generation++;
  notifySessionEnded();
});
