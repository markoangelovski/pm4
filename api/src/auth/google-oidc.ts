/* eslint-disable @typescript-eslint/no-unused-vars -- typed stub from the test step; T3 implements the bodies */
import { Injectable } from "@nestjs/common";
import { AppConfigService } from "../config/app-config.service.js";

/** The ID-token claims PM4 uses from Google. */
export interface GoogleProfile {
  subject: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
}

/**
 * Every call to Google goes through this class (feat-auth-api-session D9),
 * so e2e tests can replace it with a fake (`test/fake-google-oidc.ts`).
 */
@Injectable()
export class GoogleOidc {
  constructor(private readonly config: AppConfigService) {}

  /** Google's authorization URL. Discovery (`https://accounts.google.com`) runs once, on first use; a failed discovery is retried next time. */
  authorizationUrl(params: {
    state: string;
    codeChallenge: string;
  }): Promise<URL> {
    throw new Error("not implemented (feat-auth-api-session)");
  }

  /** Exchanges the code in `callbackUrl`; validates state, PKCE and the ID token. Throws on any failure. */
  exchange(
    callbackUrl: URL,
    check: { state: string; codeVerifier: string }
  ): Promise<GoogleProfile> {
    throw new Error("not implemented (feat-auth-api-session)");
  }
}
