import { APP_PREFIX, routes } from "@/lib/routes";

export const RETURN_TO_PARAM = "returnTo";
export const RETURN_TO_MAX_LENGTH = 2048;

/** Dummy origin for parsing: any parsed URL with another origin was absolute. */
const PARSE_ORIGIN = "https://pm4.invalid";

function hasForbiddenChar(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f || code === 0x5c /* \ */) return true;
  }
  return false;
}

/** The valid `returnTo` (pathname + search), or null. Never throws. */
export function sanitizeReturnTo(
  raw: string | null | undefined
): string | null {
  // 1. A non-empty string.
  if (typeof raw !== "string" || raw.length === 0) return null;
  // 2. Bounded length.
  if (raw.length > RETURN_TO_MAX_LENGTH) return null;
  // 3. Relative to the site root, not protocol-relative.
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  // 4. No backslash, no control characters.
  if (hasForbiddenChar(raw)) return null;
  // 5. Parses, and stays on our origin.
  let url: URL;
  try {
    url = new URL(raw, PARSE_ORIGIN);
  } catch {
    return null;
  }
  if (url.origin !== PARSE_ORIGIN) return null;
  // 6. A private route, checked after parsing so dot segments are normalized.
  if (
    url.pathname !== routes.app.dashboard &&
    !url.pathname.startsWith(APP_PREFIX)
  ) {
    return null;
  }
  // 7. No trailing slashes; the hash is dropped.
  const path = url.pathname.replace(/\/+$/, "");
  return path + url.search;
}

/** Where the guard sends a signed-out visitor. Input: window.location.pathname + search. */
export function landingHref(
  currentPathAndQuery: string | null | undefined
): string {
  const returnTo = sanitizeReturnTo(currentPathAndQuery);
  if (returnTo === null || returnTo === routes.app.dashboard) {
    return routes.landing;
  }
  return `${routes.landing}?${RETURN_TO_PARAM}=${encodeURIComponent(returnTo)}`;
}

/** The landing page's Login target. */
export function signInHref(returnTo: string | null | undefined): string {
  const safe = sanitizeReturnTo(returnTo);
  if (safe === null) return routes.signIn;
  return `${routes.signIn}?${RETURN_TO_PARAM}=${encodeURIComponent(safe)}`;
}

/** Where the callback sends the user after the token exchange. */
export function postSignInPath(returnTo: string | null | undefined): string {
  return sanitizeReturnTo(returnTo) ?? routes.app.dashboard;
}
