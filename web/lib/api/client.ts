import createClient from "openapi-fetch";
import { getAccessToken, refreshAccessToken } from "@/lib/auth/session";
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

function withBearer(request: Request, token: string | null): Request {
  if (token === null) return request;
  const authorized = new Request(request);
  authorized.headers.set("Authorization", `Bearer ${token}`);
  return authorized;
}

/** Adds the bearer token (except for public paths); on 401 refreshes once and retries once. */
export async function authFetch(request: Request): Promise<Response> {
  if (PUBLIC_API_PATHS.includes(new URL(request.url).pathname)) {
    return fetch(request);
  }
  // The body of a sent request is consumed: keep an unsent copy for the retry.
  const retry = request.clone();
  const token = await getAccessToken();
  const response = await fetch(withBearer(request, token));
  if (response.status !== 401) return response;

  const refreshed = await refreshAccessToken();
  if (refreshed === null) return response;
  return fetch(withBearer(retry, refreshed));
}

/**
 * Typed fetch client for the PM4 API (ADR-0010). Every request goes through
 * `authFetch` (D9): bearer token and refresh-on-401.
 */
export const apiClient = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  fetch: authFetch
});
