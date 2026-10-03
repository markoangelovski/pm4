import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor
} from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import { SessionUnavailableError } from "@/lib/auth/session";
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

const KEY = "pm4.refreshToken";

function renderGuard() {
  const queryClient = createQueryClient();
  queryClient.setQueryData(["projects"], ["previous user's data"]);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const view = render(
    <AuthGuard>
      <div>Private content</div>
    </AuthGuard>,
    { wrapper }
  );
  return { queryClient, ...view };
}

describe("AuthGuard (feat-auth-web-session)", () => {
  beforeEach(() => {
    replace.mockReset();
    session.getAccessToken.mockReset();
    session.listeners.clear();
    window.localStorage.clear();
    window.history.replaceState(null, "", "/app/tasks?x=1");
  });

  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("AC-14 FR-AUTH-005: a spinner while checking; children with a token; no session → token cleared and sent to the landing page", async () => {
    let resolve!: (token: string | null) => void;
    session.getAccessToken.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      })
    );
    const checking = renderGuard();
    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
    expect(screen.queryByText("Private content")).not.toBeInTheDocument();

    await act(async () => resolve("A1"));
    expect(await screen.findByText("Private content")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    checking.unmount();

    window.localStorage.setItem(KEY, "R1");
    session.getAccessToken.mockResolvedValue(null);
    const signedOut = renderGuard();
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/?returnTo=%2Fapp%2Ftasks%3Fx%3D1")
    );
    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(signedOut.queryClient.getQueryData(["projects"])).toBeUndefined();
    expect(screen.queryByText("Private content")).not.toBeInTheDocument();
    signedOut.unmount();

    replace.mockReset();
    window.history.replaceState(null, "", "/app");
    renderGuard();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  it("AC-15 FR-AUTH-003: an unreachable API shows Retry and keeps the token; Retry renders the children once a token arrives", async () => {
    window.localStorage.setItem(KEY, "R1");
    session.getAccessToken
      .mockRejectedValueOnce(new SessionUnavailableError("API unreachable"))
      .mockResolvedValue("A1");
    renderGuard();

    expect(
      await screen.findByText("Can't reach PM4 right now.")
    ).toBeInTheDocument();
    expect(screen.queryByText("Private content")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(KEY)).toBe("R1");
    expect(replace).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Private content")).toBeInTheDocument();
    expect(session.getAccessToken).toHaveBeenCalledTimes(2);
    expect(replace).not.toHaveBeenCalled();
  });

  it("AC-16 FR-AUTH-004: when the session ends while ready, the query cache is cleared and the user goes to the landing page", async () => {
    session.getAccessToken.mockResolvedValue("A1");
    const { queryClient, unmount } = renderGuard();
    expect(await screen.findByText("Private content")).toBeInTheDocument();

    window.history.replaceState(null, "", "/app/project?id=7");
    act(() => {
      for (const listener of [...session.listeners]) listener();
    });

    expect(replace).toHaveBeenCalledWith(
      "/?returnTo=%2Fapp%2Fproject%3Fid%3D7"
    );
    expect(queryClient.getQueryData(["projects"])).toBeUndefined();

    unmount();
    expect(session.listeners.size).toBe(0);
  });
});
