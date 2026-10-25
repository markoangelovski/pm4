import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import { SessionUnavailableError } from "@/lib/auth/session";
import { AuthGuard } from "./auth-guard";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(window.location.search)
}));

const session = vi.hoisted(() => ({
  getAccessToken: vi.fn<() => Promise<string | null>>(),
  onSessionEnded: vi.fn(() => () => {})
}));

vi.mock("@/lib/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/session")>()),
  getAccessToken: session.getAccessToken,
  onSessionEnded: session.onSessionEnded
}));

const UNREACHABLE = "Can't reach PM4 right now.";
const OFFLINE = /You're offline/;

function setOnline(online: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(online);
}

function renderGuard() {
  const queryClient = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(
    <AuthGuard>
      <div>Private content</div>
    </AuthGuard>,
    { wrapper }
  );
}

describe("AuthGuard offline (feat-shell-pwa)", () => {
  beforeEach(() => {
    replace.mockReset();
    session.getAccessToken.mockReset();
    window.history.replaceState(null, "", "/app/projects");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, "", "/");
  });

  it("AC-15 FR-AUTH-003 SCR-006: offline → the unreachable screen with the banner; the network's return checks the session again", async () => {
    setOnline(false);
    session.getAccessToken.mockRejectedValueOnce(new SessionUnavailableError());

    renderGuard();

    expect(await screen.findByText(UNREACHABLE)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(OFFLINE);
    expect(session.getAccessToken).toHaveBeenCalledTimes(1);

    session.getAccessToken.mockResolvedValueOnce("token");
    act(() => {
      setOnline(true);
      window.dispatchEvent(new Event("online"));
    });

    expect(await screen.findByText("Private content")).toBeInTheDocument();
    expect(session.getAccessToken).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(UNREACHABLE)).not.toBeInTheDocument();
  });

  it("AC-15 FR-AUTH-003: online and unreachable → no banner, Retry as before", async () => {
    setOnline(true);
    session.getAccessToken.mockRejectedValueOnce(new SessionUnavailableError());

    renderGuard();

    expect(await screen.findByText(UNREACHABLE)).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    session.getAccessToken.mockResolvedValueOnce("token");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Private content")).toBeInTheDocument();
    expect(session.getAccessToken).toHaveBeenCalledTimes(2);
  });
});
