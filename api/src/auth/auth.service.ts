import { createHash } from "node:crypto";
import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { AppConfigService } from "../config/app-config.service.js";
import { UsersRepository } from "../users/users.repository.js";
import { AccessTokenService } from "./access-token.service.js";
import { TokenPairDto } from "./dto/token-pair.dto.js";
import { GoogleOidc } from "./google-oidc.js";
import { randomSecret, SessionStore } from "./session.store.js";

const RETURN_TO_MAX = 2048;
const TIME_ZONE_MAX = 64;
// C0 controls, DEL and C1 controls.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/;

/** endpoints.md *Valid returnTo*: a relative path, else `null`. */
export function sanitizeReturnTo(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  if (raw.length < 1 || raw.length > RETURN_TO_MAX) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  if (raw.includes("\\") || CONTROL_CHARS.test(raw)) return null;
  return raw;
}

/**
 * A named time zone `Intl` accepts (≤ 64 chars), canonicalised; else `null`.
 * Fixed UTC offsets (`+01:00`, `-0530`) aren't IANA names and are rejected.
 */
export function sanitizeTimeZone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  if (raw.length < 1 || raw.length > TIME_ZONE_MAX) return null;
  let resolved: string;
  try {
    resolved = new Intl.DateTimeFormat("en-US", {
      timeZone: raw
    }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
  if (resolved.startsWith("+") || resolved.startsWith("-")) return null;
  return resolved;
}

/**
 * An error for the log: its `name` and, if present, `cause.code` (e.g.
 * Postgres `23505`). Never the message: Drizzle's include query parameters.
 */
function describeError(error: unknown): string {
  if (!(error instanceof Error)) return "unknown error";
  const cause: unknown = error.cause;
  const code =
    typeof cause === "object" && cause !== null && "code" in cause
      ? cause.code
      : undefined;
  return typeof code === "string" || typeof code === "number"
    ? `${error.name} (cause code ${code})`
    : error.name;
}

type SignInError = "cancelled" | "not-allowed" | "failed";

/**
 * The sign-in flow (API-AUTH-001…006, security.md *Authentication flow*).
 * Never logs tokens, codes or request bodies.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly google: GoogleOidc,
    private readonly sessions: SessionStore,
    private readonly users: UsersRepository,
    private readonly accessTokens: AccessTokenService
  ) {}

  /** API-AUTH-001: stores the state entry and returns Google's URL. */
  async start(returnTo: unknown, timeZone: unknown): Promise<string> {
    const state = randomSecret();
    const codeVerifier = randomSecret();
    const codeChallenge = createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");
    await this.sessions.saveState(state, {
      codeVerifier,
      returnTo: sanitizeReturnTo(returnTo),
      timeZone: sanitizeTimeZone(timeZone)
    });
    const url = await this.google.authorizationUrl({ state, codeChallenge });
    return url.href;
  }

  /** API-AUTH-002: always a web URL, success or failure (D5, D11). */
  async callback(
    query: Record<string, unknown>,
    rawQuery: string
  ): Promise<string> {
    let returnTo: string | null = null;
    try {
      const state = typeof query.state === "string" ? query.state : null;
      const entry = state ? await this.sessions.takeState(state) : null;
      if (!state || !entry) return this.failureUrl("failed", null);
      returnTo = entry.returnTo;

      if (query.error !== undefined) {
        return this.failureUrl(
          query.error === "access_denied" ? "cancelled" : "failed",
          returnTo
        );
      }
      if (typeof query.code !== "string" || query.code.length === 0) {
        return this.failureUrl("failed", returnTo);
      }

      const callbackUrl = new URL(this.config.googleCallbackUrl);
      callbackUrl.search = rawQuery;
      const profile = await this.google.exchange(callbackUrl, {
        state,
        codeVerifier: entry.codeVerifier
      });
      if (!profile.emailVerified) return this.failureUrl("failed", returnTo);
      if (!this.isAllowed(profile.email)) {
        return this.failureUrl("not-allowed", returnTo);
      }

      const user = await this.users.upsertFromGoogle(
        profile,
        entry.timeZone ?? "UTC"
      );
      const code = await this.sessions.createLoginCode(user.id);
      return this.webUrl("/auth/callback", { code, returnTo });
    } catch (error) {
      this.logger.warn(`Google sign-in failed: ${describeError(error)}`);
      return this.failureUrl("failed", returnTo);
    }
  }

  /** API-AUTH-003: consumes the login code and starts a session. */
  async exchangeCode(code: string): Promise<TokenPairDto> {
    const userId = await this.sessions.takeLoginCode(code);
    if (!userId) throw new UnauthorizedException("Invalid or expired code.");
    const refreshToken = await this.sessions.startFamily(userId);
    return this.tokenPair(userId, refreshToken);
  }

  /** API-AUTH-004: rotation, reuse detection, and the allow-list on every refresh. */
  async refresh(token: string): Promise<TokenPairDto> {
    const rotated = await this.sessions.rotate(token);
    if (!rotated) {
      throw new UnauthorizedException("Invalid or expired refresh token.");
    }
    const user = await this.users.findById(rotated.userId);
    if (!user || !this.isAllowed(user.email)) {
      await this.sessions.revokeFamily(rotated.familyId);
      throw new UnauthorizedException("Invalid or expired refresh token.");
    }
    return this.tokenPair(user.id, rotated.refreshToken);
  }

  /** API-AUTH-005: revokes the token's session; unknown tokens are a no-op. */
  logout(token: string): Promise<void> {
    return this.sessions.revokeByToken(token);
  }

  /** API-AUTH-006: revokes every session of the user. */
  logoutAll(userId: string): Promise<void> {
    return this.sessions.revokeAll(userId);
  }

  private isAllowed(email: string): boolean {
    const allowed = this.config.allowedEmails;
    return allowed.length === 0 || allowed.includes(email.toLowerCase());
  }

  private async tokenPair(
    userId: string,
    refreshToken: string
  ): Promise<TokenPairDto> {
    const { token, expiresAt } = await this.accessTokens.sign(userId);
    return {
      accessToken: token,
      accessTokenExpiresAt: expiresAt.toISOString(),
      refreshToken
    };
  }

  private failureUrl(error: SignInError, returnTo: string | null): string {
    return this.webUrl("/auth/sign-in", { error, returnTo });
  }

  private webUrl(
    path: "/auth/callback" | "/auth/sign-in",
    params: { code?: string; error?: SignInError; returnTo: string | null }
  ): string {
    const url = new URL(path, this.config.webAppUrl);
    if (params.code !== undefined) url.searchParams.set("code", params.code);
    if (params.error !== undefined) url.searchParams.set("error", params.error);
    if (params.returnTo !== null) {
      url.searchParams.set("returnTo", params.returnTo);
    }
    return url.href;
  }
}
