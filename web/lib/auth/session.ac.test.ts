import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// openapi-fetch captures globalThis.fetch when a client is created, and session.ts may create its
// client at import: stub fetch and the API base URL before any import.
const fetchMock = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://api.test";
  const fn = vi.fn<typeof fetch>();
  globalThis.fetch = fn;
  return fn;
});

import {
  SessionUnavailableError,
  exchangeLoginCode,
  getAccessToken,
  googleSignInUrl,
  onSessionEnded,
  resetSessionForTests,
  signOut
} from "./session";

const API = "http://api.test";
const KEY = "pm4.refreshToken";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function problem(status: number): Response {
  return new Response(
    JSON.stringify({ type: "about:blank", title: "Error", status }),
    { status, headers: { "Content-Type": "application/problem+json" } }
  );
}

function tokenPair(accessToken: string, refreshToken: string, expiresAt: Date) {
  return {
    accessToken,
    accessTokenExpiresAt: expiresAt.toISOString(),
    refreshToken
  };
}

function inMinutes(minutes: number): Date {
  return new Date(Date.now() + minutes * 60_000);
}

/** Answers each request by its pathname. */
function routeFetch(
  handlers: Record<string, () => Response | Promise<Response>>
): void {
  fetchMock.mockImplementation(async (input) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const handler = handlers[new URL(url).pathname];
    if (!handler) throw new Error(`unexpected request: ${url}`);
    return handler();
  });
}

/** The i-th request fetch received. Read each index once (the body is a stream). */
async function sentRequest(i: number) {
  const [input, init] = fetchMock.mock.calls[i];
  const request = new Request(input, init);
  return {
    url: request.url,
    method: request.method,
    body: (await request.text()) || null
  };
}

function storageRemovedElsewhere(): void {
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: KEY,
      oldValue: "R1",
      newValue: null,
      storageArea: window.localStorage
    })
  );
}

describe("session (feat-auth-web-session)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    fetchMock.mockReset();
    resetSessionForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, "locks");
  });

  it("AC-3 FR-AUTH-003: getAccessToken() with no stored token → null, no request", async () => {
    await expect(getAccessToken()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("AC-4 FR-AUTH-003: refresh rotates the stored token, and the access token is reused until 30 s before expiry", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-03T10:00:00Z"));
    window.localStorage.setItem(KEY, "R1");
    routeFetch({
      "/api/v1/auth/refresh": () =>
        jsonResponse(
          200,
          tokenPair("A1", "R2", new Date("2026-10-03T10:15:00Z"))
        )
    });

    await expect(getAccessToken()).resolves.toBe("A1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const first = await sentRequest(0);
    expect(first.url).toBe(`${API}/api/v1/auth/refresh`);
    expect(first.method).toBe("POST");
    expect(JSON.parse(first.body ?? "")).toEqual({ refreshToken: "R1" });
    expect(window.localStorage.getItem(KEY)).toBe("R2");

    vi.setSystemTime(new Date("2026-10-03T10:14:29Z"));
    await expect(getAccessToken()).resolves.toBe("A1");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date("2026-10-03T10:14:31Z"));
    routeFetch({
      "/api/v1/auth/refresh": () =>
        jsonResponse(
          200,
          tokenPair("A2", "R3", new Date("2026-10-03T10:29:31Z"))
        )
    });
    await expect(getAccessToken()).resolves.toBe("A2");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const second = await sentRequest(1);
    expect(JSON.parse(second.body ?? "")).toEqual({ refreshToken: "R2" });
    expect(window.localStorage.getItem(KEY)).toBe("R3");
  });

  it("AC-5 FR-AUTH-003: concurrent calls share one refresh, run inside the pm4-auth-refresh lock and read the token inside it", async () => {
    window.localStorage.setItem(KEY, "R1");
    routeFetch({
      "/api/v1/auth/refresh": () =>
        jsonResponse(200, tokenPair("A1", "R2", inMinutes(15)))
    });

    const plain = await Promise.all([
      getAccessToken(),
      getAccessToken(),
      getAccessToken()
    ]);
    expect(plain).toEqual(["A1", "A1", "A1"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resetSessionForTests();
    fetchMock.mockClear();
    window.localStorage.setItem(KEY, "R1");
    const request = vi.fn(async (name: string, ...rest: unknown[]) => {
      // Another tab rotated the token while this tab waited for the lock.
      window.localStorage.setItem(KEY, "R-other-tab");
      const callback = rest[rest.length - 1] as (lock: unknown) => unknown;
      return callback({ name, mode: "exclusive" });
    });
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: { request }
    });

    const locked = await Promise.all([
      getAccessToken(),
      getAccessToken(),
      getAccessToken()
    ]);
    expect(locked).toEqual(["A1", "A1", "A1"]);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toBe("pm4-auth-refresh");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const sent = await sentRequest(0);
    expect(JSON.parse(sent.body ?? "")).toEqual({
      refreshToken: "R-other-tab"
    });
  });

  it("AC-6 FR-AUTH-003: only a rejected refresh (401/400) ends the session; network errors, 500 and 429 keep it", async () => {
    for (const status of [401, 400]) {
      resetSessionForTests();
      fetchMock.mockReset();
      window.localStorage.setItem(KEY, "R1");
      routeFetch({ "/api/v1/auth/refresh": () => problem(status) });
      const ended = vi.fn();
      const stop = onSessionEnded(ended);

      await expect(getAccessToken()).resolves.toBeNull();
      expect(window.localStorage.getItem(KEY)).toBeNull();
      expect(ended).toHaveBeenCalledTimes(1);
      stop();
    }

    const unavailable: [string, () => Response | Promise<Response>][] = [
      ["network error", () => Promise.reject(new TypeError("Failed to fetch"))],
      ["500", () => problem(500)],
      ["429", () => problem(429)]
    ];
    for (const [, answer] of unavailable) {
      resetSessionForTests();
      fetchMock.mockReset();
      window.localStorage.setItem(KEY, "R1");
      routeFetch({ "/api/v1/auth/refresh": answer });
      const ended = vi.fn();
      const stop = onSessionEnded(ended);

      await expect(getAccessToken()).rejects.toBeInstanceOf(
        SessionUnavailableError
      );
      expect(window.localStorage.getItem(KEY)).toBe("R1");
      expect(ended).not.toHaveBeenCalled();
      stop();
    }
  });

  it("AC-8 FR-AUTH-001: exchangeLoginCode stores the refresh token and caches the access token; a 401 throws and stores nothing", async () => {
    routeFetch({
      "/api/v1/auth/token": () =>
        jsonResponse(200, tokenPair("A1", "R1", inMinutes(15)))
    });

    await exchangeLoginCode("c");
    const sent = await sentRequest(0);
    expect(sent.url).toBe(`${API}/api/v1/auth/token`);
    expect(sent.method).toBe("POST");
    expect(JSON.parse(sent.body ?? "")).toEqual({ code: "c" });
    expect(window.localStorage.getItem(KEY)).toBe("R1");
    await expect(getAccessToken()).resolves.toBe("A1");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resetSessionForTests();
    window.localStorage.clear();
    fetchMock.mockReset();
    routeFetch({ "/api/v1/auth/token": () => problem(401) });

    await expect(exchangeLoginCode("used")).rejects.toThrow();
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it("AC-9 FR-AUTH-004: signOut posts the stored token to logout, then clears it; errors are ignored; no token → no request", async () => {
    routeFetch({
      "/api/v1/auth/token": () =>
        jsonResponse(200, tokenPair("A1", "R1", inMinutes(15))),
      "/api/v1/auth/logout": () => new Response(null, { status: 204 })
    });
    await exchangeLoginCode("c");

    await signOut();
    const sent = await sentRequest(1);
    expect(sent.url).toBe(`${API}/api/v1/auth/logout`);
    expect(sent.method).toBe("POST");
    expect(JSON.parse(sent.body ?? "")).toEqual({ refreshToken: "R1" });
    expect(window.localStorage.getItem(KEY)).toBeNull();
    // The cached access token is gone too.
    await expect(getAccessToken()).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const failures: (() => Response | Promise<Response>)[] = [
      () => Promise.reject(new TypeError("Failed to fetch")),
      () => problem(500)
    ];
    for (const answer of failures) {
      resetSessionForTests();
      fetchMock.mockReset();
      window.localStorage.setItem(KEY, "R1");
      routeFetch({ "/api/v1/auth/logout": answer });

      await expect(signOut()).resolves.toBeUndefined();
      expect(window.localStorage.getItem(KEY)).toBeNull();
    }

    resetSessionForTests();
    fetchMock.mockReset();
    window.localStorage.clear();
    await signOut();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("AC-10 FR-AUTH-004: a storage event removing the key ends the session and drops the cached token", async () => {
    routeFetch({
      "/api/v1/auth/token": () =>
        jsonResponse(200, tokenPair("A1", "R1", inMinutes(15)))
    });
    await exchangeLoginCode("c");
    const ended = vi.fn();
    const stop = onSessionEnded(ended);

    storageRemovedElsewhere();

    expect(ended).toHaveBeenCalledTimes(1);
    await expect(getAccessToken()).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    stop();
  });

  it("AC-11 FR-AUTH-001: googleSignInUrl adds a valid returnTo, then the browser time zone", () => {
    const resolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
    vi.spyOn(
      Intl.DateTimeFormat.prototype,
      "resolvedOptions"
    ).mockImplementation(function (this: Intl.DateTimeFormat) {
      return { ...resolvedOptions.call(this), timeZone: "Europe/Zagreb" };
    });

    expect(googleSignInUrl("/app/projects")).toBe(
      `${API}/api/v1/auth/google?returnTo=%2Fapp%2Fprojects&timeZone=Europe%2FZagreb`
    );
    for (const returnTo of ["/home", "https://evil.example", null]) {
      expect(googleSignInUrl(returnTo)).toBe(
        `${API}/api/v1/auth/google?timeZone=Europe%2FZagreb`
      );
    }
  });
});
