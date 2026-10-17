import { BlockList, isIP } from "node:net";

/** Why a PMSPA URL is refused (FR-INT-002, OQ-145, OQ-160). */
export type PmspaUrlProblem = "not-a-url" | "not-https" | "private";

export const PMSPA_URL_MESSAGES: Record<PmspaUrlProblem, string> = {
  "not-a-url": "Enter a full URL starting with https://.",
  "not-https": "The URL must start with https://.",
  private: "This address is private or local, so PM4 can't connect to it."
};

const PRIVATE_IPV4 = new BlockList();
const PRIVATE_IPV6 = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
  ["224.0.0.0", 3]
] as const) {
  PRIVATE_IPV4.addSubnet(net, prefix, "ipv4");
}
PRIVATE_IPV6.addAddress("::", "ipv6");
PRIVATE_IPV6.addAddress("::1", "ipv6");
PRIVATE_IPV6.addSubnet("fc00::", 7, "ipv6");
PRIVATE_IPV6.addSubnet("fe80::", 10, "ipv6");

/** `::ffff:a.b.c.d` or `::ffff:xxxx:xxxx` → the IPv4 dotted form, else null. */
function mappedIpv4(address: string): string | null {
  const match = /^::ffff:(.+)$/i.exec(address);
  if (!match) return null;
  const rest = match[1];
  if (isIP(rest) === 4) return rest;
  const groups = /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(rest);
  if (!groups) return null;
  const high = parseInt(groups[1], 16);
  const low = parseInt(groups[2], 16);
  return [high >> 8, high & 0xff, low >> 8, low & 0xff].join(".");
}

/** A private, loopback, link-local or otherwise non-public address; `::ffff:<IPv4>` is checked as its IPv4. */
export function isPrivateAddress(address: string): boolean {
  const bare = address.replace(/%.*$/, "");
  const family = isIP(bare);
  if (family === 0) return false;
  if (family === 4) return PRIVATE_IPV4.check(bare, "ipv4");
  const ipv4 = mappedIpv4(bare);
  if (ipv4 !== null) return PRIVATE_IPV4.check(ipv4, "ipv4");
  return PRIVATE_IPV6.check(bare, "ipv6");
}

/** `URL.hostname` without the brackets of an IPv6 literal. */
export function bareHostname(hostname: string): string {
  return hostname.startsWith("[") ? hostname.slice(1, -1) : hostname;
}

/** `development` only: `localhost` and `127.0.0.1` over http or https, any port (FR-INT-002). */
export function isDevelopmentLocal(
  url: URL,
  nodeEnv: "development" | "test" | "production"
): boolean {
  const host = bareHostname(url.hostname);
  return (
    nodeEnv === "development" &&
    (host === "localhost" || host === "127.0.0.1") &&
    (url.protocol === "http:" || url.protocol === "https:")
  );
}

/**
 * The URL rule by syntax and protocol only, no DNS. `development` accepts
 * `localhost` / `127.0.0.1` over http or https on any port.
 */
export function pmspaUrlProblem(
  url: string,
  nodeEnv: "development" | "test" | "production"
): PmspaUrlProblem | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "not-a-url";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "not-a-url";
  }
  if (isDevelopmentLocal(parsed, nodeEnv)) return null;
  if (parsed.protocol !== "https:") return "not-https";
  const host = bareHostname(parsed.hostname);
  if (host === "localhost" || isPrivateAddress(host)) return "private";
  return null;
}
