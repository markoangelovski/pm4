import { vi } from "vitest";
import { AppConfigService } from "../config/app-config.service.js";
import { GoogleOidc } from "./google-oidc.js";

// `openid-client` is mocked whole: no test talks to Google.
const oidc = vi.hoisted(() => ({
  discovery: vi.fn(),
  buildAuthorizationUrl: vi.fn(),
  authorizationCodeGrant: vi.fn()
}));
vi.mock("openid-client", () => oidc);

const CALLBACK_URL = "http://localhost:3001/api/v1/auth/google/callback";
const config = {
  googleClientId: "client-id",
  googleClientSecret: "client-secret",
  googleCallbackUrl: CALLBACK_URL
} as unknown as AppConfigService;

/** What the mocked `discovery` resolves to; the other calls must receive it. */
const discovered = { issuer: "https://accounts.google.com" };

describe("GoogleOidc (feat-auth-api-session)", () => {
  let google: GoogleOidc;

  beforeEach(() => {
    vi.resetAllMocks();
    oidc.discovery.mockResolvedValue(discovered);
    oidc.buildAuthorizationUrl.mockReturnValue(
      new URL("https://accounts.google.com/o/oauth2/v2/auth?x=1")
    );
    google = new GoogleOidc(config);
  });

  it("AC-22 FR-AUTH-001: authorizationUrl discovers Google and passes exactly the sign-in parameters", async () => {
    const url = await google.authorizationUrl({
      state: "the-state",
      codeChallenge: "the-challenge"
    });

    expect(url.href).toBe("https://accounts.google.com/o/oauth2/v2/auth?x=1");
    expect(oidc.discovery).toHaveBeenCalledTimes(1);
    const [issuer, clientId, clientSecret] = oidc.discovery.mock.calls[0] as [
      URL,
      string,
      string
    ];
    expect(String(issuer)).toBe("https://accounts.google.com/");
    expect(clientId).toBe("client-id");
    expect(clientSecret).toBe("client-secret");
    expect(oidc.buildAuthorizationUrl).toHaveBeenCalledWith(discovered, {
      redirect_uri: CALLBACK_URL,
      scope: "openid email profile",
      state: "the-state",
      code_challenge: "the-challenge",
      code_challenge_method: "S256",
      prompt: "select_account"
    });
  });

  it("AC-22 FR-AUTH-001: discovery runs once for two calls", async () => {
    await google.authorizationUrl({ state: "s1", codeChallenge: "c1" });
    await google.authorizationUrl({ state: "s2", codeChallenge: "c2" });

    expect(oidc.discovery).toHaveBeenCalledTimes(1);
    expect(oidc.buildAuthorizationUrl).toHaveBeenCalledTimes(2);
  });

  it("AC-22 FR-AUTH-001: a failed discovery is retried on the next call", async () => {
    oidc.discovery.mockRejectedValueOnce(new Error("network down"));

    await expect(
      google.authorizationUrl({ state: "s1", codeChallenge: "c1" })
    ).rejects.toThrow();
    await expect(
      google.authorizationUrl({ state: "s2", codeChallenge: "c2" })
    ).resolves.toBeInstanceOf(URL);
    expect(oidc.discovery).toHaveBeenCalledTimes(2);
  });

  it("AC-22 FR-AUTH-001: exchange passes the PKCE/state checks and maps the ID-token claims", async () => {
    oidc.authorizationCodeGrant.mockResolvedValue({
      claims: () => ({
        sub: "google-sub-1",
        email: "ada@example.com",
        email_verified: true,
        name: "Ada Lovelace",
        picture: "https://lh3.googleusercontent.com/a/ada"
      })
    });
    const callbackUrl = new URL(`${CALLBACK_URL}?code=abc&state=the-state`);

    const profile = await google.exchange(callbackUrl, {
      state: "the-state",
      codeVerifier: "the-verifier"
    });

    expect(oidc.authorizationCodeGrant).toHaveBeenCalledWith(
      discovered,
      callbackUrl,
      {
        pkceCodeVerifier: "the-verifier",
        expectedState: "the-state",
        idTokenExpected: true
      }
    );
    expect(profile).toEqual({
      subject: "google-sub-1",
      email: "ada@example.com",
      emailVerified: true,
      name: "Ada Lovelace",
      picture: "https://lh3.googleusercontent.com/a/ada"
    });
  });

  it("AC-22 FR-AUTH-001: missing email_verified → false, missing name and picture → null", async () => {
    oidc.authorizationCodeGrant.mockResolvedValue({
      claims: () => ({ sub: "google-sub-2", email: "bob@example.com" })
    });

    const profile = await google.exchange(
      new URL(`${CALLBACK_URL}?code=abc&state=s`),
      { state: "s", codeVerifier: "v" }
    );

    expect(profile).toEqual({
      subject: "google-sub-2",
      email: "bob@example.com",
      emailVerified: false,
      name: null,
      picture: null
    });
  });

  it("AC-22 FR-AUTH-001: exchange rejects when openid-client rejects", async () => {
    oidc.authorizationCodeGrant.mockRejectedValue(new Error("invalid_grant"));

    await expect(
      google.exchange(new URL(`${CALLBACK_URL}?code=abc&state=s`), {
        state: "s",
        codeVerifier: "v"
      })
    ).rejects.toThrow();
  });
});
