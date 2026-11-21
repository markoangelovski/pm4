import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import { signInHref } from "@/lib/auth/return-to";
import { AuthGuard } from "./auth-guard";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(window.location.search)
}));

const session = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  return {
    listeners,
    getAccessToken: vi.fn<() => Promise<string | null>>(),
    onSessionEnded: vi.fn((listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    })
  };
});

vi.mock("@/lib/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/session")>()),
  getAccessToken: session.getAccessToken,
  onSessionEnded: session.onSessionEnded
}));

const CONSENT_SIGN_IN =
  "/auth/sign-in?returnTo=%2Fauth%2Fconsent%3Frequest%3Dabc";

function renderGuard(withSignedOutHref: boolean) {
  const queryClient = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(
    withSignedOutHref ? (
      <AuthGuard signedOutHref={signInHref}>
        <div>Private content</div>
      </AuthGuard>
    ) : (
      <AuthGuard>
        <div>Private content</div>
      </AuthGuard>
    ),
    { wrapper }
  );
}

describe("AuthGuard signedOutHref (feat-mcp-web)", () => {
  beforeEach(() => {
    replace.mockReset();
    session.getAccessToken.mockReset();
    session.listeners.clear();
    window.localStorage.clear();
    window.history.replaceState(null, "", "/auth/consent?request=abc");
  });

  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("AC-3 FR-MCP-001/D4: with signedOutHref, no session → replace to sign-in with the consent page as returnTo; with a session, children render and a session-ended event does the same; without the prop at /app/projects → the landing page", async () => {
    session.getAccessToken.mockResolvedValue(null);
    const signedOut = renderGuard(true);
    await waitFor(() => expect(replace).toHaveBeenCalledWith(CONSENT_SIGN_IN));
    expect(screen.queryByText("Private content")).not.toBeInTheDocument();
    signedOut.unmount();

    replace.mockReset();
    session.getAccessToken.mockResolvedValue("A1");
    const signedIn = renderGuard(true);
    expect(await screen.findByText("Private content")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    act(() => {
      for (const listener of [...session.listeners]) listener();
    });
    expect(replace).toHaveBeenCalledWith(CONSENT_SIGN_IN);
    signedIn.unmount();

    replace.mockReset();
    session.getAccessToken.mockResolvedValue(null);
    window.history.replaceState(null, "", "/app/projects");
    renderGuard(false);
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/?returnTo=%2Fapp%2Fprojects")
    );
  });
});
