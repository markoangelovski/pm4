// Typed stub from the test step (OQ-183): the e2e test overrides `PMSPA_FETCH`.
// T4 adds `PmspaTransport`.

export interface PmspaRequest {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  baseUrl: string;
  /** Starts with `/v1/`. */
  path: string;
  query?: Record<string, string>;
  token?: string;
  body?: unknown;
}

export interface PmspaResponse {
  status: number;
  headers: Headers;
  /** Parsed JSON, or null. */
  body: unknown;
}

/** Timeout, DNS, connection, a redirect or a private address. */
export class PmspaUnreachableError extends Error {}

/** DI token for the `fetch` every PMSPA call uses (overridden in e2e tests). */
export const PMSPA_FETCH = Symbol("PMSPA_FETCH");
