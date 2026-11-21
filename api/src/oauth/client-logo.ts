const LOOPBACK_HOSTS = new Set(["127.0.0.1", "[::1]", "localhost"]);

/**
 * The client's logo_uri when it passes endpoints.md *App logo*, otherwise null.
 * Never throws.
 */
export function clientLogoUri(
  value: unknown,
  clientIdHost: string
): string | null {
  if (typeof value !== "string" || value.length < 1 || value.length > 2048) {
    return null;
  }
  let uri: URL;
  try {
    uri = new URL(value);
  } catch {
    return null;
  }
  if (uri.protocol !== "https:") return null;
  if (uri.username !== "" || uri.password !== "") return null;
  if (uri.host !== clientIdHost) return null;
  if (LOOPBACK_HOSTS.has(uri.hostname)) return null;
  return value;
}
