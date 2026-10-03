import { beforeEach, describe, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";

const fetchMock = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://api.test";
  const fn = vi.fn<typeof fetch>();
  globalThis.fetch = fn;
  return fn;
});

const replace = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => searchParams
}));

import { resetSessionForTests } from "@/lib/auth/session";
import { AuthCallback } from "./auth-callback";

function tokenPair() {
  return new Response(
    JSON.stringify({
      accessToken: "A1",
      accessTokenExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      refreshToken: "R1"
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

function unauthorized() {
  return new Response(
    JSON.stringify({ type: "about:blank", title: "Unauthorized", status: 401 }),
    { status: 401, headers: { "Content-Type": "application/problem+json" } }
  );
}

/** The login-code exchanges (API-AUTH-003) fetch received. */
async function tokenRequests(): Promise<unknown[]> {
  const bodies: unknown[] = [];
  for (const [input, init] of fetchMock.mock.calls) {
    const request = new Request(input, init);
    if (new URL(request.url).pathname === "/api/v1/auth/token") {
      bodies.push(await request.json());
    }
  }
  return bodies;
}

function renderStrict() {
  return render(
    <StrictMode>
      <AuthCallback />
    </StrictMode>
  );
}

describe("AuthCallback (feat-auth-web-session)", () => {
  beforeEach(() => {
    replace.mockReset();
    fetchMock.mockReset();
    window.localStorage.clear();
    resetSessionForTests();
  });

  it("AC-17 FR-AUTH-001: exchanges the code once (Strict Mode), then forwards to a valid returnTo; failures go back to sign-in", async () => {
    // Success with a valid returnTo: one exchange despite Strict Mode's double effect.
    fetchMock.mockImplementation(async () => tokenPair());
    searchParams = new URLSearchParams("code=c1&returnTo=%2Fapp%2Fprojects");
    const first = renderStrict();
    expect(screen.getByText("Signing in…")).toBeInTheDocument();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/app/projects"));
    expect(await tokenRequests()).toEqual([{ code: "c1" }]);
    expect(window.localStorage.getItem("pm4.refreshToken")).toBe("R1");
    first.unmount();

    // Success with an invalid returnTo → /app.
    replace.mockReset();
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => tokenPair());
    searchParams = new URLSearchParams("code=c2&returnTo=%2Fhome");
    const second = renderStrict();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/app"));
    second.unmount();

    // No code → failure, no request.
    replace.mockReset();
    fetchMock.mockReset();
    searchParams = new URLSearchParams("returnTo=%2Fhome");
    const third = renderStrict();
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/auth/sign-in?error=failed")
    );
    expect(fetchMock).not.toHaveBeenCalled();
    third.unmount();

    // The exchange fails with a valid returnTo → it's kept.
    replace.mockReset();
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => unauthorized());
    searchParams = new URLSearchParams("code=c3&returnTo=%2Fapp%2Fprojects");
    const fourth = renderStrict();
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        "/auth/sign-in?error=failed&returnTo=%2Fapp%2Fprojects"
      )
    );
    expect(replace).not.toHaveBeenCalledWith("/app/projects");
    expect(window.localStorage.getItem("pm4.refreshToken")).toBeNull();
    fourth.unmount();

    // The exchange fails with an invalid returnTo → it's dropped.
    replace.mockReset();
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => unauthorized());
    searchParams = new URLSearchParams(
      "code=c4&returnTo=https%3A%2F%2Fevil.example"
    );
    renderStrict();
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/auth/sign-in?error=failed")
    );
  });
});
