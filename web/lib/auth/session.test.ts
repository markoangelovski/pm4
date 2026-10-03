import { beforeEach, describe, expect, it, vi } from "vitest";

// openapi-fetch captures globalThis.fetch when the client is created at import: stub it first.
const fetchMock = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://api.test";
  const fn = vi.fn<typeof fetch>();
  globalThis.fetch = fn;
  return fn;
});

import { getAccessToken, resetSessionForTests, signOut } from "./session";

const KEY = "pm4.refreshToken";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("signOut race", () => {
  beforeEach(() => {
    window.localStorage.clear();
    fetchMock.mockReset();
    resetSessionForTests();
  });

  it("a refresh that starts during the logout request stores nothing when it answers 200 afterwards", async () => {
    window.localStorage.setItem(KEY, "R1");
    const logout = deferred<Response>();
    const refresh = deferred<Response>();
    let refreshStarted!: () => void;
    const refreshSent = new Promise<void>((r) => {
      refreshStarted = r;
    });
    fetchMock.mockImplementation(async (input) => {
      const url = input instanceof Request ? input.url : String(input);
      const path = new URL(url).pathname;
      if (path === "/api/v1/auth/logout") return logout.promise;
      if (path === "/api/v1/auth/refresh") {
        refreshStarted();
        return refresh.promise;
      }
      throw new Error(`unexpected request: ${url}`);
    });

    const signingOut = signOut();
    const token = getAccessToken();
    await refreshSent;

    logout.resolve(new Response(null, { status: 204 }));
    await signingOut;
    expect(window.localStorage.getItem(KEY)).toBeNull();

    refresh.resolve(
      new Response(
        JSON.stringify({
          accessToken: "A2",
          accessTokenExpiresAt: new Date(
            Date.now() + 15 * 60_000
          ).toISOString(),
          refreshToken: "R2"
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    await expect(token).resolves.toBeNull();
    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
