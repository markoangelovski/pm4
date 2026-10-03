import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://api.test";
  const fn = vi.fn<typeof fetch>();
  globalThis.fetch = fn;
  return fn;
});

const session = vi.hoisted(() => ({
  getAccessToken: vi.fn<() => Promise<string | null>>(),
  refreshAccessToken: vi.fn<() => Promise<string | null>>()
}));

vi.mock("@/lib/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/session")>()),
  ...session
}));

import { authFetch } from "./client";

const API = "http://api.test";

/** The i-th request fetch received. Read each index once (the body is a stream). */
async function sentRequest(i: number) {
  const [input, init] = fetchMock.mock.calls[i];
  const request = new Request(input, init);
  return {
    url: request.url,
    method: request.method,
    authorization: request.headers.get("Authorization"),
    body: (await request.text()) || null
  };
}

function status(code: number): Response {
  return new Response(code === 204 ? null : "{}", {
    status: code,
    headers: { "Content-Type": "application/json" }
  });
}

describe("authFetch (feat-auth-web-session)", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    session.getAccessToken.mockReset();
    session.refreshAccessToken.mockReset();
  });

  it("AC-12 FR-AUTH-003: private paths get the bearer token; public paths get none and never refresh", async () => {
    session.getAccessToken.mockResolvedValue("A1");
    session.refreshAccessToken.mockResolvedValue("A2");
    fetchMock.mockImplementation(async () => status(200));

    await authFetch(new Request(`${API}/api/v1/me`));
    expect((await sentRequest(0)).authorization).toBe("Bearer A1");

    await authFetch(
      new Request(`${API}/api/v1/auth/logout-all`, { method: "POST" })
    );
    expect((await sentRequest(1)).authorization).toBe("Bearer A1");

    session.getAccessToken.mockClear();
    session.refreshAccessToken.mockClear();
    fetchMock.mockReset();
    // A 401 from a public endpoint is the caller's answer, not a reason to refresh.
    fetchMock.mockImplementation(async () => status(401));
    const publicRequests: [string, string][] = [
      ["GET", "/api/v1/version"],
      ["GET", "/api/v1/auth/google"],
      ["GET", "/api/v1/auth/google/callback"],
      ["POST", "/api/v1/auth/token"],
      ["POST", "/api/v1/auth/refresh"],
      ["POST", "/api/v1/auth/logout"]
    ];
    for (const [i, [method, path]] of publicRequests.entries()) {
      const response = await authFetch(
        new Request(`${API}${path}`, { method })
      );
      expect(response.status).toBe(401);
      const sent = await sentRequest(i);
      expect(sent.url).toBe(`${API}${path}`);
      expect(sent.authorization).toBeNull();
    }
    expect(fetchMock).toHaveBeenCalledTimes(publicRequests.length);
    expect(session.getAccessToken).not.toHaveBeenCalled();
    expect(session.refreshAccessToken).not.toHaveBeenCalled();
  });

  it("AC-13 FR-AUTH-003: a 401 refreshes once and retries once with the same method and body", async () => {
    const projectRequest = () =>
      new Request(`${API}/api/v1/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "P" })
      });

    // 401 → refresh → retry succeeds.
    session.getAccessToken.mockResolvedValue("A1");
    session.refreshAccessToken.mockResolvedValue("A2");
    fetchMock
      .mockResolvedValueOnce(status(401))
      .mockResolvedValueOnce(status(201));
    const retried = await authFetch(projectRequest());
    expect(retried.status).toBe(201);
    expect(session.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const first = await sentRequest(0);
    expect(first.authorization).toBe("Bearer A1");
    const retry = await sentRequest(1);
    expect(retry.url).toBe(`${API}/api/v1/projects`);
    expect(retry.method).toBe("POST");
    expect(retry.body).toBe(JSON.stringify({ name: "P" }));
    expect(retry.authorization).toBe("Bearer A2");

    // A second 401 is returned as is, with no more refreshes.
    fetchMock.mockReset();
    session.refreshAccessToken.mockClear();
    fetchMock.mockImplementation(async () => status(401));
    const twice = await authFetch(projectRequest());
    expect(twice.status).toBe(401);
    expect(session.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // A rejected refresh returns the first 401, with no retry.
    fetchMock.mockReset();
    session.refreshAccessToken.mockReset();
    session.refreshAccessToken.mockResolvedValue(null);
    const unauthorized = status(401);
    fetchMock.mockResolvedValueOnce(unauthorized);
    const rejected = await authFetch(projectRequest());
    expect(rejected).toBe(unauthorized);
    expect(session.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
