/**
 * API shapes the agent-access screens need (req-agents, ADR-0013) that `lib/api/schema` doesn't have yet:
 * the consent page (FR-MCP-005) and Settings → Connected apps (FR-MCP-009). Both call the REST API with the
 * web's own token; the OAuth endpoints the apps call (`/oauth/*`, `/mcp`) are the API's and have no web UI.
 * `npm run api:types` replaces these once the API task lands.
 */

/** OQ-289: `pm4:write` includes `pm4:read`. */
export type OAuthScope = "pm4:read" | "pm4:write";

/** The app (OAuth client) as the user sees it. */
export type OAuthClientDto = {
  /** From the Client ID Metadata Document, or the DCR registration (FR-MCP-003). */
  name: string;
  /** Host of the `client_id` URL; for a DCR client, the host of its first redirect URI. */
  clientIdHost: string;
};

/**
 * A pending authorization request: `GET /oauth/authorize` validated it and sent the browser to the consent page
 * with its id. Unknown id → 404; an untrusted client or redirect never reaches here (the API sends the browser to
 * the consent page with `?error=` instead, FR-MCP-004).
 */
export type ConsentRequestDto = {
  id: string;
  client: OAuthClientDto;
  /** Host (with port for a loopback address) the browser returns to. */
  redirectHost: string;
  /** `127.0.0.1`, `[::1]` or `localhost` (OQ-295): the page warns "This app runs on this computer". */
  loopback: boolean;
  /** What the app asked for, exactly; the user allows all of it or denies (OQ-289). */
  scopes: OAuthScope[];
  /** After this instant Allow fails with 410 and the page offers no Allow. */
  expiresAt: string;
  /** The user's existing grant for this app (OQ-293), or null. */
  existingGrant: { connectedAt: string } | null;
};

/** Allow / Deny: where the browser goes next (the app's redirect URI with `code` + `state`, or `error=access_denied`). */
export type ConsentResultDto = {
  redirectUrl: string;
};

/** One grant in Settings → Connected apps (FR-MCP-009). */
export type ConnectedAppDto = {
  /** The grant's id. */
  id: string;
  client: OAuthClientDto;
  scopes: OAuthScope[];
  connectedAt: string;
  /** The last token issued or refreshed for the grant; null = never used since connecting. */
  lastUsedAt: string | null;
};

export type ConnectedAppListDto = { items: ConnectedAppDto[] };

/** The `?error=` the API sends the browser to the consent page with (FR-MCP-003, FR-MCP-004). */
export type ConsentErrorCode = "invalid_client" | "invalid_redirect_uri";

type Json<T> = {
  headers: { [name: string]: unknown };
  content: { "application/json": T };
};
type Problem = {
  headers: { [name: string]: unknown };
  content: {
    "application/problem+json": import("@/lib/api/problem").ProblemDetails;
  };
};
type NoParams = {
  query?: never;
  header?: never;
  path?: never;
  cookie?: never;
};
type IdParams<K extends string> = {
  query?: never;
  header?: never;
  path: { [P in K]: string };
  cookie?: never;
};
type Op<P, R> = { parameters: P; requestBody?: never; responses: R };
type Unused = {
  get?: never;
  put?: never;
  post?: never;
  delete?: never;
  options?: never;
  head?: never;
  patch?: never;
  trace?: never;
};

/** The new endpoints, in `openapi-typescript`'s `paths` shape, for the mock client. */
export type ProposedPaths = {
  "/api/v1/oauth/consent/{requestId}": Omit<Unused, "get"> & {
    parameters: NoParams;
    get: Op<
      IdParams<"requestId">,
      { 200: Json<ConsentRequestDto>; 404: Problem }
    >;
  };
  "/api/v1/oauth/consent/{requestId}/allow": Omit<Unused, "post"> & {
    parameters: NoParams;
    post: Op<
      IdParams<"requestId">,
      { 200: Json<ConsentResultDto>; 404: Problem; 410: Problem }
    >;
  };
  "/api/v1/oauth/consent/{requestId}/deny": Omit<Unused, "post"> & {
    parameters: NoParams;
    post: Op<
      IdParams<"requestId">,
      { 200: Json<ConsentResultDto>; 404: Problem; 410: Problem }
    >;
  };
  "/api/v1/connected-apps": Omit<Unused, "get"> & {
    parameters: NoParams;
    get: Op<NoParams, { 200: Json<ConnectedAppListDto> }>;
  };
  "/api/v1/connected-apps/{id}": Omit<Unused, "delete"> & {
    parameters: NoParams;
    delete: Op<
      IdParams<"id">,
      {
        204: { headers: { [name: string]: unknown }; content?: never };
        404: Problem;
      }
    >;
  };
};
