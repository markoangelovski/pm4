export const RETURN_TO_PARAM = "returnTo";
export const RETURN_TO_MAX_LENGTH = 2048;

/** The valid `returnTo` (pathname + search), or null. Never throws. */
export function sanitizeReturnTo(
  raw: string | null | undefined
): string | null {
  void raw;
  throw new Error("not implemented (feat-land-app-route-split)");
}

/** Where the guard sends a signed-out visitor. Input: window.location.pathname + search. */
export function landingHref(
  currentPathAndQuery: string | null | undefined
): string {
  void currentPathAndQuery;
  throw new Error("not implemented (feat-land-app-route-split)");
}

/** The landing page's Login target. */
export function signInHref(returnTo: string | null | undefined): string {
  void returnTo;
  throw new Error("not implemented (feat-land-app-route-split)");
}

/** Where the callback sends the user after the token exchange. */
export function postSignInPath(returnTo: string | null | undefined): string {
  void returnTo;
  throw new Error("not implemented (feat-land-app-route-split)");
}
