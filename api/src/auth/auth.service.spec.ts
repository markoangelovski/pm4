import { Logger, UnauthorizedException } from "@nestjs/common";
import { vi } from "vitest";
import { AppConfigService } from "../config/app-config.service.js";
import { UsersRepository } from "../users/users.repository.js";
import { AccessTokenService } from "./access-token.service.js";
import {
  AuthService,
  sanitizeReturnTo,
  sanitizeTimeZone
} from "./auth.service.js";
import { GoogleOidc, GoogleProfile } from "./google-oidc.js";
import { SessionStore } from "./session.store.js";

const WEB = "http://localhost:3000";
const CALLBACK = "http://localhost:3001/api/v1/auth/google/callback";

const profile: GoogleProfile = {
  subject: "sub-1",
  email: "ada@example.com",
  emailVerified: true,
  name: "Ada",
  picture: null
};

describe("sanitizeReturnTo", () => {
  it.each(["/app/projects", "/", "/a?b=c#d"])("keeps %s", (value) => {
    expect(sanitizeReturnTo(value)).toBe(value);
  });

  it.each([
    undefined,
    ["/a"],
    "",
    "app",
    "//evil.com",
    "https://evil.com",
    "/a\\b",
    "/a\nb",
    "/a\u007fb",
    `/${"a".repeat(2048)}`
  ])("drops %j", (value) => {
    expect(sanitizeReturnTo(value)).toBeNull();
  });

  it("keeps exactly 2048 chars", () => {
    const value = `/${"a".repeat(2047)}`;
    expect(sanitizeReturnTo(value)).toBe(value);
  });
});

describe("sanitizeTimeZone", () => {
  it("keeps a valid IANA zone", () => {
    expect(sanitizeTimeZone("Europe/Zagreb")).toBe("Europe/Zagreb");
  });

  it.each(["UTC", "Etc/GMT-1", "Europe/Kiev"])("keeps %j", (value) => {
    expect(sanitizeTimeZone(value)).toBe(value);
  });

  it.each([
    undefined,
    "",
    "Mars/Base",
    ["UTC"],
    "A".repeat(65),
    "+01:00",
    "-0530",
    "+01"
  ])("drops %j", (value) => {
    expect(sanitizeTimeZone(value)).toBeNull();
  });
});

describe("AuthService", () => {
  let allowedEmails: string[];
  let google: {
    authorizationUrl: ReturnType<typeof vi.fn>;
    exchange: ReturnType<typeof vi.fn>;
  };
  let sessions: Record<string, ReturnType<typeof vi.fn>>;
  let users: {
    upsertFromGoogle: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
  };
  let service: AuthService;

  beforeEach(() => {
    allowedEmails = [];
    const config = {
      webAppUrl: WEB,
      googleCallbackUrl: CALLBACK,
      get allowedEmails() {
        return allowedEmails;
      }
    } as unknown as AppConfigService;
    google = {
      authorizationUrl: vi
        .fn()
        .mockResolvedValue(new URL("https://google.test/auth")),
      exchange: vi.fn().mockResolvedValue(profile)
    };
    sessions = {
      saveState: vi.fn().mockResolvedValue(undefined),
      takeState: vi.fn().mockResolvedValue({
        codeVerifier: "verifier",
        returnTo: "/app/projects",
        timeZone: "Europe/Zagreb"
      }),
      createLoginCode: vi.fn().mockResolvedValue("login-code"),
      takeLoginCode: vi.fn(),
      startFamily: vi.fn().mockResolvedValue("refresh-1"),
      rotate: vi.fn(),
      revokeFamily: vi.fn().mockResolvedValue(undefined),
      revokeByToken: vi.fn().mockResolvedValue(undefined),
      revokeAll: vi.fn().mockResolvedValue(undefined)
    };
    users = {
      upsertFromGoogle: vi
        .fn()
        .mockResolvedValue({ id: "user-1", email: profile.email }),
      findById: vi
        .fn()
        .mockResolvedValue({ id: "user-1", email: profile.email })
    };
    const accessTokens = {
      sign: vi.fn().mockResolvedValue({
        token: "jwt",
        expiresAt: new Date("2026-01-01T00:15:00.000Z")
      })
    } as unknown as AccessTokenService;
    service = new AuthService(
      config,
      google as unknown as GoogleOidc,
      sessions as unknown as SessionStore,
      users as unknown as UsersRepository,
      accessTokens
    );
  });

  it("start stores a sanitised state entry and returns Google's URL", async () => {
    const url = await service.start("//evil.com", "Europe/Zagreb");

    expect(url).toBe("https://google.test/auth");
    const [state, entry] = sessions.saveState.mock.calls[0] as [
      string,
      { codeVerifier: string; returnTo: string | null; timeZone: string | null }
    ];
    expect(entry).toMatchObject({ returnTo: null, timeZone: "Europe/Zagreb" });
    expect(google.authorizationUrl).toHaveBeenCalledWith({
      state,
      codeChallenge: expect.any(String) as string
    });
  });

  it("callback success → login code and returnTo, callback URL carries the raw query", async () => {
    const url = await service.callback(
      { code: "c", state: "s" },
      "code=c&state=s"
    );

    expect(url).toBe(
      `${WEB}/auth/callback?code=login-code&returnTo=%2Fapp%2Fprojects`
    );
    const [callbackUrl, check] = google.exchange.mock.calls[0] as [
      URL,
      unknown
    ];
    expect(callbackUrl.href).toBe(`${CALLBACK}?code=c&state=s`);
    expect(check).toEqual({ state: "s", codeVerifier: "verifier" });
    expect(users.upsertFromGoogle).toHaveBeenCalledWith(
      profile,
      "Europe/Zagreb"
    );
  });

  it("callback without a state entry → failed, without returnTo", async () => {
    sessions.takeState.mockResolvedValue(null);
    await expect(service.callback({ code: "c", state: "s" }, "")).resolves.toBe(
      `${WEB}/auth/sign-in?error=failed`
    );
    await expect(service.callback({ code: "c" }, "")).resolves.toBe(
      `${WEB}/auth/sign-in?error=failed`
    );
  });

  it("callback maps Google errors, a missing code and an unverified email", async () => {
    const failed = `${WEB}/auth/sign-in?error=failed&returnTo=%2Fapp%2Fprojects`;
    await expect(
      service.callback({ error: "access_denied", state: "s" }, "")
    ).resolves.toBe(
      `${WEB}/auth/sign-in?error=cancelled&returnTo=%2Fapp%2Fprojects`
    );
    await expect(
      service.callback({ error: "x", state: "s" }, "")
    ).resolves.toBe(failed);
    await expect(service.callback({ state: "s" }, "")).resolves.toBe(failed);

    google.exchange.mockResolvedValue({ ...profile, emailVerified: false });
    await expect(service.callback({ code: "c", state: "s" }, "")).resolves.toBe(
      failed
    );
    expect(users.upsertFromGoogle).not.toHaveBeenCalled();
  });

  it("callback failure logs the error's name and cause code, never its message", async () => {
    const warn = vi
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => undefined);
    const error = new Error("insert ... params: ada@example.com, Ada", {
      cause: Object.assign(new Error("duplicate key"), { code: "23505" })
    });
    error.name = "DrizzleQueryError";
    users.upsertFromGoogle.mockRejectedValue(error);

    await expect(service.callback({ code: "c", state: "s" }, "")).resolves.toBe(
      `${WEB}/auth/sign-in?error=failed&returnTo=%2Fapp%2Fprojects`
    );
    google.exchange.mockRejectedValue(new TypeError("secret detail"));
    await service.callback({ code: "c", state: "s" }, "");

    const logged = warn.mock.calls.map(([message]) => String(message));
    expect(logged).toEqual([
      "Google sign-in failed: DrizzleQueryError (cause code 23505)",
      "Google sign-in failed: TypeError"
    ]);
    warn.mockRestore();
  });

  it("callback → not-allowed when the allow-list excludes the email", async () => {
    allowedEmails = ["owner@example.com"];
    await expect(service.callback({ code: "c", state: "s" }, "")).resolves.toBe(
      `${WEB}/auth/sign-in?error=not-allowed&returnTo=%2Fapp%2Fprojects`
    );
    expect(users.upsertFromGoogle).not.toHaveBeenCalled();
  });

  it("callback → failed when the upsert throws (e.g. email taken)", async () => {
    users.upsertFromGoogle.mockRejectedValue(new Error("unique violation"));
    await expect(service.callback({ code: "c", state: "s" }, "")).resolves.toBe(
      `${WEB}/auth/sign-in?error=failed&returnTo=%2Fapp%2Fprojects`
    );
  });

  it("exchangeCode → token pair; unknown code → 401", async () => {
    sessions.takeLoginCode.mockResolvedValueOnce("user-1");
    await expect(service.exchangeCode("code")).resolves.toEqual({
      accessToken: "jwt",
      accessTokenExpiresAt: "2026-01-01T00:15:00.000Z",
      refreshToken: "refresh-1"
    });
    expect(sessions.startFamily).toHaveBeenCalledWith("user-1");

    sessions.takeLoginCode.mockResolvedValueOnce(null);
    await expect(service.exchangeCode("code")).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });

  it("refresh → rotated pair; unknown token → 401", async () => {
    sessions.rotate.mockResolvedValueOnce({
      userId: "user-1",
      familyId: "fam",
      refreshToken: "refresh-2"
    });
    await expect(service.refresh("refresh-1")).resolves.toMatchObject({
      refreshToken: "refresh-2"
    });

    sessions.rotate.mockResolvedValueOnce(null);
    await expect(service.refresh("x")).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });

  it("refresh revokes the family when the user is gone or not allowed", async () => {
    const rotated = { userId: "user-1", familyId: "fam", refreshToken: "r" };
    sessions.rotate.mockResolvedValue(rotated);

    users.findById.mockResolvedValueOnce(null);
    await expect(service.refresh("r")).rejects.toBeInstanceOf(
      UnauthorizedException
    );

    allowedEmails = ["owner@example.com"];
    await expect(service.refresh("r")).rejects.toBeInstanceOf(
      UnauthorizedException
    );

    expect(sessions.revokeFamily).toHaveBeenCalledTimes(2);
    expect(sessions.revokeFamily).toHaveBeenCalledWith("fam");
  });

  it("logout and logoutAll delegate to the store", async () => {
    await service.logout("r");
    await service.logoutAll("user-1");
    expect(sessions.revokeByToken).toHaveBeenCalledWith("r");
    expect(sessions.revokeAll).toHaveBeenCalledWith("user-1");
  });
});
