import createClient from "openapi-fetch";
import type { paths } from "./schema";

/**
 * Typed fetch client for the PM4 API (ADR-0010). Auth headers, 401
 * refresh-and-retry and Problem Details error mapping land with auth (M1).
 * TODO(M1): attach the bearer token and add the shared single-flight
 * refresh-on-401 described in conventions.md.
 */
export const apiClient = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
});
