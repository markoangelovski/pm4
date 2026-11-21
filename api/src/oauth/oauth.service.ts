import { createHash } from "node:crypto";
import { GoneException, Injectable, NotFoundException } from "@nestjs/common";
import { UsersRepository } from "../users/users.repository.js";
import { AppConfigService } from "../config/app-config.service.js";
import { ClientRegistry } from "./client-registry.js";
import type { ConsentRequestDto, ConsentResultDto } from "./dto/consent.dto.js";
import { GrantsRepository } from "./grants.repository.js";
import { GrantsService } from "./grants.service.js";
import { McpTokenService } from "./mcp-token.service.js";
import { OAuthError } from "./oauth-error.js";
import { OAuthStore, type PendingRequest } from "./oauth.store.js";
import { oauthUrls, parseScope, scopeList } from "./oauth-urls.js";
import { isLoopbackUri, matchRedirectUri } from "./redirect-uri.js";

export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
}

const VERIFIER = /^[A-Za-z0-9\-._~]{43,128}$/;

/** A required form parameter: a non-empty string, else `invalid_request`. */
function required(body: Record<string, unknown>, name: string): string {
  const value = body[name];
  if (typeof value !== "string" || value === "") {
    throw new OAuthError("invalid_request", `Missing or invalid ${name}.`);
  }
  return value;
}

/** An optional form parameter: undefined when absent; repeated → `invalid_request`. */
function optional(
  body: Record<string, unknown>,
  name: string
): string | undefined {
  const value = body[name];
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new OAuthError("invalid_request", `Invalid ${name}.`);
  }
  return value;
}

const REQUEST_LIFETIME_MS = 10 * 60 * 1000;
const CHALLENGE = /^[A-Za-z0-9\-._~]{43,128}$/;

/** A query value: the string, undefined when absent, null when repeated or not a string. */
function field(value: unknown): string | undefined | null {
  if (value === undefined) return undefined;
  return typeof value === "string" ? value : null;
}

@Injectable()
export class OAuthService {
  constructor(
    private readonly config: AppConfigService,
    private readonly registry: ClientRegistry,
    private readonly store: OAuthStore,
    private readonly grants: GrantsRepository,
    private readonly grantsService: GrantsService,
    private readonly tokens: McpTokenService,
    private readonly users: UsersRepository
  ) {}

  /** API-MCP-004 in its order; returns the 302 target. */
  async authorize(query: Record<string, unknown>): Promise<string> {
    const consent = `${this.config.webAppUrl}/auth/consent`;
    const toConsentError = (error: string) => `${consent}?error=${error}`;

    const clientId = field(query.client_id);
    if (!clientId) return toConsentError("invalid_client");
    const client = await this.registry.resolve(clientId);
    if (!client) return toConsentError("invalid_client");

    const redirectUri = field(query.redirect_uri);
    if (!redirectUri || !matchRedirectUri(redirectUri, client.redirectUris)) {
      return toConsentError("invalid_redirect_uri");
    }

    const state = field(query.state);
    const stateValid =
      typeof state === "string" ? state.length <= 500 : state === undefined;
    const toApp = (error: string): string => {
      const target = new URL(redirectUri);
      target.searchParams.set("error", error);
      if (typeof state === "string" && stateValid) {
        target.searchParams.set("state", state);
      }
      return target.toString();
    };

    if (field(query.response_type) !== "code") {
      return toApp("unsupported_response_type");
    }
    const challenge = field(query.code_challenge);
    if (
      typeof challenge !== "string" ||
      !CHALLENGE.test(challenge) ||
      field(query.code_challenge_method) !== "S256"
    ) {
      return toApp("invalid_request");
    }
    const rawScope = field(query.scope);
    const scope = rawScope === null ? null : parseScope(rawScope);
    if (!scope) return toApp("invalid_scope");
    const resource = field(query.resource);
    if (
      resource === null ||
      (resource !== undefined && resource !== oauthUrls(this.config).resource)
    ) {
      return toApp("invalid_target");
    }
    if (!stateValid) return toApp("invalid_request");

    const id = await this.store.saveRequest({
      clientId: client.clientId,
      clientName: client.name,
      clientIdHost: client.clientIdHost,
      logoUri: client.logoUri,
      redirectUri,
      codeChallenge: challenge,
      scope,
      state: typeof state === "string" ? state : null,
      expiresAt: new Date(Date.now() + REQUEST_LIFETIME_MS).toISOString()
    });
    return `${consent}?request=${id}`;
  }

  /** API-MCP-005 */
  async getConsent(
    userId: string,
    requestId: string
  ): Promise<ConsentRequestDto> {
    const pending = await this.store.getRequest(requestId);
    if (!pending) throw new NotFoundException("Consent request not found.");
    const redirect = new URL(pending.redirectUri);
    const loopback = isLoopbackUri(redirect);
    const existing = await this.grants.findGrant(userId, pending.clientId);
    return {
      id: requestId,
      client: { name: pending.clientName, clientIdHost: pending.clientIdHost },
      redirectHost: loopback ? redirect.host : redirect.hostname,
      loopback,
      scopes: scopeList(pending.scope),
      expiresAt: pending.expiresAt,
      existingGrant: existing
        ? { connectedAt: existing.createdAt.toISOString() }
        : null
    };
  }

  /** API-MCP-006 */
  async allow(userId: string, requestId: string): Promise<ConsentResultDto> {
    const pending = await this.takeLive(requestId);
    const { grant, replacedId } = await this.grants.replaceGrant(
      userId,
      pending.clientId,
      pending.clientName,
      pending.logoUri ?? null,
      pending.scope
    );
    if (replacedId) await this.store.revokeGrant(replacedId);
    await this.store.startFamily(grant.id, userId, pending.clientId);
    const code = await this.store.createCode({
      grantId: grant.id,
      userId,
      clientId: pending.clientId,
      redirectUri: pending.redirectUri,
      codeChallenge: pending.codeChallenge,
      scope: pending.scope
    });
    return { redirectUrl: this.redirectTo(pending, { code }) };
  }

  /** API-MCP-007 */
  async deny(_userId: string, requestId: string): Promise<ConsentResultDto> {
    const pending = await this.takeLive(requestId);
    return {
      redirectUrl: this.redirectTo(pending, { error: "access_denied" })
    };
  }

  /** Consumes the request: 404 unknown, 410 past `expiresAt`. */
  private async takeLive(requestId: string): Promise<PendingRequest> {
    const pending = await this.store.takeRequest(requestId);
    if (!pending) throw new NotFoundException("Consent request not found.");
    if (Date.parse(pending.expiresAt) < Date.now()) {
      throw new GoneException("The consent request has expired.");
    }
    return pending;
  }

  private redirectTo(
    pending: PendingRequest,
    params: Record<string, string>
  ): string {
    const url = new URL(pending.redirectUri);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    if (pending.state !== null) url.searchParams.set("state", pending.state);
    return url.toString();
  }

  /** API-MCP-008 */
  async token(body: Record<string, unknown>): Promise<TokenResponse> {
    const grantType = required(body, "grant_type");
    if (grantType !== "authorization_code" && grantType !== "refresh_token") {
      throw new OAuthError("unsupported_grant_type");
    }
    const clientId = body.client_id;
    if (Array.isArray(clientId)) {
      throw new OAuthError("invalid_request", "Repeated client_id.");
    }
    if (typeof clientId !== "string" || clientId === "") {
      throw new OAuthError("invalid_client", "Missing client_id.", 401);
    }
    const resource = optional(body, "resource");
    return grantType === "authorization_code"
      ? this.exchangeCode(body, clientId, resource)
      : this.refresh(body, clientId, resource);
  }

  private checkResource(resource: string | undefined): void {
    if (
      resource !== undefined &&
      resource !== oauthUrls(this.config).resource
    ) {
      throw new OAuthError("invalid_target");
    }
  }

  private async exchangeCode(
    body: Record<string, unknown>,
    clientId: string,
    resource: string | undefined
  ): Promise<TokenResponse> {
    const code = required(body, "code");
    const redirectUri = required(body, "redirect_uri");
    const verifier = required(body, "code_verifier");
    const stored = await this.store.takeCode(code);
    const invalid = new OAuthError("invalid_grant");
    if (!stored) throw invalid;
    if (stored.clientId !== clientId || stored.redirectUri !== redirectUri) {
      throw invalid;
    }
    this.checkResource(resource);
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    if (!VERIFIER.test(verifier) || challenge !== stored.codeChallenge) {
      throw invalid;
    }
    const grant = await this.grants.findGrantById(stored.grantId);
    if (!grant) throw invalid;
    const refreshToken = await this.store.issueFirstRefresh(grant.id);
    if (!refreshToken) throw invalid;
    return this.respond(grant, refreshToken);
  }

  private async refresh(
    body: Record<string, unknown>,
    clientId: string,
    resource: string | undefined
  ): Promise<TokenResponse> {
    const token = required(body, "refresh_token");
    this.checkResource(resource);
    const invalid = new OAuthError("invalid_grant");
    const rotated = await this.store.rotate(token, clientId);
    if (!rotated) throw invalid;
    const grant = await this.grants.findGrantById(rotated.grantId);
    const user = grant ? await this.users.findById(rotated.userId) : null;
    if (!grant || !user || !this.isAllowed(user.email)) {
      // deleteGrant revokes the Redis family itself when the row existed;
      // revoke here only when the row was already gone.
      const deleted = await this.grantsService.deleteGrant(
        rotated.userId,
        rotated.grantId
      );
      if (!deleted) await this.store.revokeGrant(rotated.grantId);
      throw invalid;
    }
    return this.respond(grant, rotated.refreshToken);
  }

  private isAllowed(email: string): boolean {
    const allowed = this.config.allowedEmails;
    return allowed.length === 0 || allowed.includes(email.toLowerCase());
  }

  private async respond(
    grant: {
      id: string;
      userId: string;
      clientId: string;
      scope: "read" | "write";
    },
    refreshToken: string
  ): Promise<TokenResponse> {
    const { token, expiresIn } = await this.tokens.sign({
      userId: grant.userId,
      grantId: grant.id,
      clientId: grant.clientId,
      scope: grant.scope
    });
    return {
      access_token: token,
      token_type: "Bearer",
      expires_in: expiresIn,
      refresh_token: refreshToken,
      scope: scopeList(grant.scope).join(" ")
    };
  }

  /** API-MCP-009 (RFC 7009): always succeeds once `token` is present. */
  async revoke(body: Record<string, unknown>): Promise<void> {
    const token = required(body, "token");
    const clientId = body.client_id;
    if (typeof clientId !== "string" || clientId === "") return;
    const grantId = await this.store.grantIdOfToken(token);
    if (!grantId) return;
    const grant = await this.grants.findGrantById(grantId);
    if (!grant || grant.clientId !== clientId) return;
    await this.grantsService.deleteGrant(grant.userId, grant.id);
  }
}
