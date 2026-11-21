const LOOPBACK_HOSTS = new Set(["127.0.0.1", "[::1]", "localhost"]);

/** http: + hostname 127.0.0.1 | [::1] | localhost. */
export function isLoopbackUri(uri: URL): boolean {
  return uri.protocol === "http:" && LOOPBACK_HOSTS.has(uri.hostname);
}

function parse(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

/** ≤ 2000 chars, absolute, no fragment, and https: or a loopback http: URL. */
export function isValidRedirectUri(raw: string): boolean {
  if (raw.length > 2000 || raw.includes("#")) return false;
  const uri = parse(raw);
  if (!uri) return false;
  return uri.protocol === "https:" || isLoopbackUri(uri);
}

/** Exact, or loopback with same scheme/host/path/query on any port (RFC 8252 §7.3). */
export function matchRedirectUri(
  requested: string,
  registered: readonly string[]
): boolean {
  if (registered.includes(requested)) return true;
  const want = parse(requested);
  if (!want || !isLoopbackUri(want)) return false;
  return registered.some((candidate) => {
    const have = parse(candidate);
    return (
      have !== null &&
      isLoopbackUri(have) &&
      have.protocol === want.protocol &&
      have.hostname === want.hostname &&
      have.pathname === want.pathname &&
      have.search === want.search
    );
  });
}
