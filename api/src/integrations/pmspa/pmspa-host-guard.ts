// Typed stub from the test step (OQ-183): the e2e test overrides `DNS_LOOKUP`.
// T2 adds `PmspaHostGuard`.

/** DI token for the resolver the host guard uses (overridden in e2e tests). */
export const DNS_LOOKUP = Symbol("DNS_LOOKUP");

/** Default: `dns.promises.lookup(host, { all: true })`. */
export type DnsLookup = (
  host: string
) => Promise<{ address: string; family: number }[]>;
