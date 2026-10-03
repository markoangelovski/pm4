import { GoogleOidc, GoogleProfile } from "../src/auth/google-oidc.js";

/** Where the fake "sends" the browser; never requested by the tests. */
export const FAKE_GOOGLE_AUTHORIZE_URL =
  "https://accounts.google.test/o/oauth2/v2/auth";

/**
 * Stands in for `GoogleOidc` in e2e tests (feat-auth-api-session D9): records
 * every call and returns `nextResult` from `exchange`, so no test talks to
 * Google. Like the real class, `exchange` rejects when the callback URL's
 * `state` doesn't match the expected one.
 */
export class FakeGoogleOidc implements Pick<
  GoogleOidc,
  "authorizationUrl" | "exchange"
> {
  readonly authorizationCalls: { state: string; codeChallenge: string }[] = [];
  readonly exchangeCalls: {
    callbackUrl: URL;
    check: { state: string; codeVerifier: string };
  }[] = [];
  /** What the next `exchange` resolves to; an `Error` makes it reject. */
  nextResult: GoogleProfile | Error = new Error(
    "FakeGoogleOidc: no profile set for exchange()"
  );

  authorizationUrl(params: {
    state: string;
    codeChallenge: string;
  }): Promise<URL> {
    this.authorizationCalls.push({ ...params });
    const url = new URL(FAKE_GOOGLE_AUTHORIZE_URL);
    url.searchParams.set("state", params.state);
    url.searchParams.set("code_challenge", params.codeChallenge);
    return Promise.resolve(url);
  }

  exchange(
    callbackUrl: URL,
    check: { state: string; codeVerifier: string }
  ): Promise<GoogleProfile> {
    this.exchangeCalls.push({ callbackUrl, check: { ...check } });
    if (callbackUrl.searchParams.get("state") !== check.state) {
      return Promise.reject(new Error("FakeGoogleOidc: state mismatch"));
    }
    if (this.nextResult instanceof Error) {
      return Promise.reject(this.nextResult);
    }
    return Promise.resolve({ ...this.nextResult });
  }

  /** The state handed to the latest `authorizationUrl` call. */
  get lastState(): string {
    const call = this.authorizationCalls.at(-1);
    if (!call) throw new Error("FakeGoogleOidc: authorizationUrl not called");
    return call.state;
  }
}
