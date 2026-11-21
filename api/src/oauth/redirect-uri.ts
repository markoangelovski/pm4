/** http: + hostname 127.0.0.1 | [::1] | localhost. Stub: feat-mcp-oauth-api T2. */
export function isLoopbackUri(uri: URL): boolean {
  void uri;
  throw new Error("not implemented (feat-mcp-oauth-api)");
}

/** ≤ 2000 chars, absolute, no fragment, and https: or a loopback http: URL. */
export function isValidRedirectUri(raw: string): boolean {
  void raw;
  throw new Error("not implemented (feat-mcp-oauth-api)");
}

/** Exact, or loopback with same scheme/host/path/query on any port. */
export function matchRedirectUri(
  requested: string,
  registered: readonly string[]
): boolean {
  void requested;
  void registered;
  throw new Error("not implemented (feat-mcp-oauth-api)");
}
