import { Injectable } from "@nestjs/common";
import * as oidc from "openid-client";
import { AppConfigService } from "../config/app-config.service.js";

/** The ID-token claims PM4 uses from Google. */
export interface GoogleProfile {
  subject: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
}

const GOOGLE_ISSUER = "https://accounts.google.com";

/**
 * Every call to Google goes through this class (feat-auth-api-session D9),
 * so e2e tests can replace it with a fake (`test/fake-google-oidc.ts`).
 */
@Injectable()
export class GoogleOidc {
  private configuration: Promise<oidc.Configuration> | null = null;

  constructor(private readonly config: AppConfigService) {}

  /** Google's authorization URL. Discovery (`https://accounts.google.com`) runs once, on first use; a failed discovery is retried next time. */
  async authorizationUrl(params: {
    state: string;
    codeChallenge: string;
  }): Promise<URL> {
    const configuration = await this.discover();
    return oidc.buildAuthorizationUrl(configuration, {
      redirect_uri: this.config.googleCallbackUrl,
      scope: "openid email profile",
      state: params.state,
      code_challenge: params.codeChallenge,
      code_challenge_method: "S256",
      prompt: "select_account"
    });
  }

  /** Exchanges the code in `callbackUrl`; validates state, PKCE and the ID token. Throws on any failure. */
  async exchange(
    callbackUrl: URL,
    check: { state: string; codeVerifier: string }
  ): Promise<GoogleProfile> {
    const configuration = await this.discover();
    const tokens = await oidc.authorizationCodeGrant(
      configuration,
      callbackUrl,
      {
        pkceCodeVerifier: check.codeVerifier,
        expectedState: check.state,
        idTokenExpected: true
      }
    );
    const claims = tokens.claims();
    if (!claims || typeof claims.sub !== "string") {
      throw new Error("Google returned no ID token claims");
    }
    if (typeof claims.email !== "string" || claims.email.length === 0) {
      throw new Error("Google returned no email claim");
    }
    return {
      subject: claims.sub,
      email: claims.email,
      emailVerified: claims.email_verified === true,
      name: typeof claims.name === "string" ? claims.name : null,
      picture: typeof claims.picture === "string" ? claims.picture : null
    };
  }

  /** Discovers Google once; a rejected discovery is forgotten so the next call retries. */
  private discover(): Promise<oidc.Configuration> {
    if (!this.configuration) {
      const pending = oidc.discovery(
        new URL(GOOGLE_ISSUER),
        this.config.googleClientId,
        this.config.googleClientSecret
      );
      this.configuration = pending;
      pending.catch(() => {
        if (this.configuration === pending) this.configuration = null;
      });
    }
    return this.configuration;
  }
}
