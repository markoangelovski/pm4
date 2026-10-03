import createClient from "openapi-fetch";
import type { paths } from "./schema";

/** Endpoints that never get a bearer token or a refresh-and-retry (exact pathname match). */
export const PUBLIC_API_PATHS: readonly string[] = [
  "/api/v1/version",
  "/api/v1/auth/google",
  "/api/v1/auth/google/callback",
  "/api/v1/auth/token",
  "/api/v1/auth/refresh",
  "/api/v1/auth/logout"
];

/** Adds the bearer token (except for public paths); on 401 refreshes once and retries once. */
export async function authFetch(request: Request): Promise<Response> {
  throw new Error("not implemented (feat-auth-web-session)");
}

/**
 * Typed fetch client for the PM4 API (ADR-0010). Auth headers, 401
 * refresh-and-retry and Problem Details error mapping land with auth (M1).
 * TODO(M1): attach the bearer token and add the shared single-flight
 * refresh-on-401 described in conventions.md.
 */
export const apiClient = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL
});
