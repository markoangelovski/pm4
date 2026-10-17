/* eslint-disable @typescript-eslint/no-unused-vars -- typed stub from the test step; T2 implements the bodies */

/** Why a PMSPA URL is refused (FR-INT-002, OQ-145, OQ-160). */
export type PmspaUrlProblem = "not-a-url" | "not-https" | "private";

export const PMSPA_URL_MESSAGES: Record<PmspaUrlProblem, string> = {
  "not-a-url": "Enter a full URL starting with https://.",
  "not-https": "The URL must start with https://.",
  private: "This address is private or local, so PM4 can't connect to it."
};

/**
 * The URL rule by syntax and protocol only, no DNS. `development` accepts
 * `localhost` / `127.0.0.1` over http or https on any port.
 */
export function pmspaUrlProblem(
  url: string,
  nodeEnv: "development" | "test" | "production"
): PmspaUrlProblem | null {
  throw new Error("not implemented (feat-int-conn-api)");
}

/** A private, loopback, link-local or otherwise non-public address; `::ffff:<IPv4>` is checked as its IPv4. */
export function isPrivateAddress(address: string): boolean {
  throw new Error("not implemented (feat-int-conn-api)");
}
