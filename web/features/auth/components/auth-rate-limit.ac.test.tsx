import { beforeEach, describe, expect, it, vi } from "vitest";
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
import { SignInState, signInErrorMessage } from "./sign-in-state";

const RATE_LIMITED_MESSAGE =
  "Too many sign-in attempts. Try again in a minute.";

function problem(status: number, slug: string, title: string): Response {
  return new Response(
    JSON.stringify({
      type: `https://pm4.test/errors/${slug}`,
      title,
      status,
      detail: title,
      ...(status === 429 ? { retryAfterSeconds: 42 } : {})
    }),
    {
      status,
      headers: {
        "Content-Type": "application/problem+json",
        ...(status === 429 ? { "Retry-After": "42" } : {})
      }
    }
  );
}

describe("Sign-in when rate limited (feat-api-rate-limit)", () => {
  beforeEach(() => {
    replace.mockReset();
    fetchMock.mockReset();
    searchParams = new URLSearchParams();
    window.localStorage.clear();
    resetSessionForTests();
  });

  it("AC-22 SCR-001: error=rate-limited shows the rate-limit message in the alert", () => {
    expect(signInErrorMessage("rate-limited")).toBe(RATE_LIMITED_MESSAGE);

    searchParams = new URLSearchParams("error=rate-limited");
    render(<SignInState />);
    expect(screen.getByRole("alert")).toHaveTextContent(RATE_LIMITED_MESSAGE);
  });

  it("AC-23 SCR-002: a 429 from the code exchange → sign-in with error=rate-limited and the returnTo; nothing stored", async () => {
    fetchMock.mockImplementation(async () =>
      problem(429, "rate-limited", "Too Many Requests")
    );
    searchParams = new URLSearchParams("code=c&returnTo=/app/projects");
    const view = render(<AuthCallback />);

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        "/auth/sign-in?error=rate-limited&returnTo=%2Fapp%2Fprojects"
      )
    );
    expect(window.localStorage.getItem("pm4.refreshToken")).toBeNull();
    view.unmount();
  });

  it("AC-23 SCR-002: a 401 from the code exchange still → error=failed", async () => {
    fetchMock.mockImplementation(async () =>
      problem(401, "unauthorized", "Unauthorized")
    );
    searchParams = new URLSearchParams("code=c401&returnTo=/app/projects");
    render(<AuthCallback />);

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        "/auth/sign-in?error=failed&returnTo=%2Fapp%2Fprojects"
      )
    );
    expect(window.localStorage.getItem("pm4.refreshToken")).toBeNull();
  });
});
