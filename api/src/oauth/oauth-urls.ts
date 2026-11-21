import type { AppConfigService } from "../config/app-config.service.js";

/** `ISSUER` = API_PUBLIC_URL; `RESOURCE` = ISSUER + "/mcp" (endpoints.md *Shared agent-access shapes*). */
export function oauthUrls(config: AppConfigService): {
  issuer: string;
  resource: string;
} {
  const issuer = config.apiPublicUrl;
  return { issuer, resource: issuer + "/mcp" };
}

export type OAuthScope = "pm4:read" | "pm4:write";
export type GrantScope = "read" | "write"; // = enum oauth_scope

export const SCOPES_SUPPORTED: OAuthScope[] = ["pm4:read", "pm4:write"];

/** "pm4:read" → read; "pm4:write", "pm4:read pm4:write", absent/empty → write; null = an unknown value. */
export function parseScope(raw: string | undefined): GrantScope | null {
  const tokens = (raw ?? "").split(" ").filter((token) => token !== "");
  if (tokens.length === 0) return "write";
  if (tokens.some((token) => token !== "pm4:read" && token !== "pm4:write")) {
    return null;
  }
  return tokens.includes("pm4:write") ? "write" : "read";
}

/** read → ["pm4:read"]; write → ["pm4:read", "pm4:write"]. */
export function scopeList(scope: GrantScope): OAuthScope[] {
  return scope === "read" ? ["pm4:read"] : ["pm4:read", "pm4:write"];
}
