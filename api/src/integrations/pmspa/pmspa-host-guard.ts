import { promises as dns } from "node:dns";
import { isIP } from "node:net";
import { Inject, Injectable } from "@nestjs/common";
import { AppConfigService } from "../../config/app-config.service.js";
import {
  bareHostname,
  isDevelopmentLocal,
  isPrivateAddress
} from "./pmspa-url-policy.js";

/** DI token for the resolver the host guard uses (overridden in e2e tests). */
export const DNS_LOOKUP = Symbol("DNS_LOOKUP");

/** Default: `dns.promises.lookup(host, { all: true })`. */
export type DnsLookup = (
  host: string
) => Promise<{ address: string; family: number }[]>;

/** Default resolver for `DNS_LOOKUP`. */
export const defaultDnsLookup: DnsLookup = (host) =>
  dns.lookup(host, { all: true });

/**
 * Checks the addresses a PMSPA URL's host resolves to, before every call and
 * on save (security.md *Outbound calls to PMSPA*, OQ-145, OQ-160).
 */
@Injectable()
export class PmspaHostGuard {
  constructor(
    private readonly config: AppConfigService,
    @Inject(DNS_LOOKUP) private readonly lookup: DnsLookup
  ) {}

  async check(url: string): Promise<"ok" | "private" | "unresolved"> {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return "unresolved";
    }
    if (isDevelopmentLocal(parsed, this.config.nodeEnv)) return "ok";
    const host = bareHostname(parsed.hostname);
    if (isIP(host) !== 0) {
      return isPrivateAddress(host) ? "private" : "ok";
    }
    let addresses: { address: string; family: number }[];
    try {
      addresses = await this.lookup(host);
    } catch {
      return "unresolved";
    }
    if (addresses.length === 0) return "unresolved";
    if (addresses.some(({ address }) => isPrivateAddress(address))) {
      return "private";
    }
    return "ok";
  }
}
