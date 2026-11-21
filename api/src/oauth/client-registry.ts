import { Injectable } from "@nestjs/common";
import { CimdFetcher } from "./cimd-fetcher.js";
import { clientLogoUri } from "./client-logo.js";
import { GrantsRepository } from "./grants.repository.js";
import { OAuthError } from "./oauth-error.js";
import { OAuthStore } from "./oauth.store.js";
import { isValidRedirectUri } from "./redirect-uri.js";

export interface ResolvedClient {
  clientId: string;
  name: string;
  clientIdHost: string;
  redirectUris: string[];
  logoUri: string | null;
}

export interface RegisterResponse {
  client_id: string;
  client_id_issued_at: number;
  client_name: string;
  redirect_uris: string[];
  logo_uri?: string;
  token_endpoint_auth_method: "none";
  grant_types: ["authorization_code", "refresh_token"];
  response_types: ["code"];
}

const GRANT_TYPES = new Set(["authorization_code", "refresh_token"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A trimmed 1–100 character name, or null. */
function validName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name.length >= 1 && name.length <= 100 ? name : null;
}

/** 1–10 valid redirect URIs, or null. */
function validRedirectUris(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 10) {
    return null;
  }
  const uris = value as unknown[];
  return uris.every((u) => typeof u === "string" && isValidRedirectUri(u))
    ? (uris as string[])
    : null;
}

@Injectable()
export class ClientRegistry {
  constructor(
    private readonly fetcher: CimdFetcher,
    private readonly repository: GrantsRepository,
    private readonly store: OAuthStore
  ) {}

  /** A CIMD client (cache, then fetch) or a DCR client (a UUID). null = unknown or invalid. */
  async resolve(clientId: string): Promise<ResolvedClient | null> {
    try {
      if (/^https?:\/\//i.test(clientId))
        return await this.resolveCimd(clientId);
      const client = await this.repository.findClient(clientId);
      if (!client) return null;
      return {
        clientId: client.id,
        name: client.name,
        clientIdHost: new URL(client.redirectUris[0]).host,
        redirectUris: client.redirectUris,
        logoUri: client.logoUri
      };
    } catch {
      return null;
    }
  }

  private async resolveCimd(clientId: string): Promise<ResolvedClient | null> {
    if (clientId.length > 2048 || clientId.includes("#")) return null;
    let url: URL;
    try {
      url = new URL(clientId);
    } catch {
      return null;
    }
    if (url.pathname === "" || url.pathname === "/") return null;
    if (url.protocol !== "https:" && !this.fetcher.isDevUrl(url)) return null;

    const cached = await this.store.getCachedClient(clientId);
    if (cached) return { ...cached, logoUri: cached.logoUri ?? null };

    const doc = await this.fetcher.fetchJson(url);
    if (!isObject(doc) || doc.client_id !== clientId) return null;
    const name = validName(doc.client_name);
    const redirectUris = validRedirectUris(doc.redirect_uris);
    if (!name || !redirectUris) return null;
    const method = doc.token_endpoint_auth_method;
    if (method !== undefined && method !== "none") return null;

    const client: ResolvedClient = {
      clientId,
      name,
      clientIdHost: url.host,
      redirectUris,
      logoUri: clientLogoUri(doc.logo_uri, url.host)
    };
    await this.store.cacheClient(clientId, client);
    return client;
  }

  /** API-MCP-003. */
  async register(body: unknown): Promise<RegisterResponse> {
    const invalidMetadata = (description: string) =>
      new OAuthError("invalid_client_metadata", description);
    if (!isObject(body))
      throw invalidMetadata("The body must be a JSON object.");

    const name = validName(body.client_name);
    if (!name) throw invalidMetadata("client_name must be 1–100 characters.");
    const method = body.token_endpoint_auth_method;
    if (method !== undefined && method !== "none") {
      throw invalidMetadata(
        "Only token_endpoint_auth_method none is supported."
      );
    }
    const grantTypes = body.grant_types;
    if (
      grantTypes !== undefined &&
      !(
        Array.isArray(grantTypes) &&
        (grantTypes as unknown[]).every(
          (g) => typeof g === "string" && GRANT_TYPES.has(g)
        )
      )
    ) {
      throw invalidMetadata(
        "grant_types may only hold authorization_code and refresh_token."
      );
    }
    const responseTypes = body.response_types;
    if (
      responseTypes !== undefined &&
      !(
        Array.isArray(responseTypes) &&
        responseTypes.length === 1 &&
        responseTypes[0] === "code"
      )
    ) {
      throw invalidMetadata("response_types may only be [code].");
    }
    const redirectUris = validRedirectUris(body.redirect_uris);
    if (!redirectUris) {
      throw new OAuthError(
        "invalid_redirect_uri",
        "redirect_uris must hold 1–10 https or loopback http URLs without a fragment."
      );
    }

    const logoUri = clientLogoUri(body.logo_uri, new URL(redirectUris[0]).host);
    const row = await this.repository.registerClient(
      name,
      redirectUris,
      logoUri
    );
    return {
      client_id: row.id,
      client_id_issued_at: Math.floor(row.createdAt.getTime() / 1000),
      client_name: name,
      redirect_uris: redirectUris,
      ...(logoUri === null ? {} : { logo_uri: logoUri }),
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"]
    };
  }
}
