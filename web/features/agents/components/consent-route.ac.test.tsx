import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import ConsentRoutePage from "@/app/auth/consent/page";
import { ConsentRoute } from "./consent-route";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(window.location.search)
}));

const session = vi.hoisted(() => ({
  getAccessToken: vi.fn<() => Promise<string | null>>()
}));
vi.mock("@/lib/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/session")>()),
  getAccessToken: session.getAccessToken,
  onSessionEnded: vi.fn(() => () => undefined)
}));

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  DELETE: vi.fn()
}));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

const toast = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() })
);
vi.mock("sonner", () => ({ toast }));

function renderWithClient(ui: React.ReactNode) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("ConsentRoute and the consent page (feat-mcp-web)", () => {
  beforeEach(() => {
    replace.mockReset();
    session.getAccessToken.mockReset();
    Object.values(api).forEach((fn) => fn.mockReset());
    toast.error.mockReset();
    window.localStorage.clear();
  });

  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("AC-14 FR-MCP-005/D5: ?error= renders children without a session check; ?request= signed out → sign-in with returnTo, no children; signed in → children", async () => {
    window.history.replaceState(null, "", "/auth/consent?error=invalid_client");
    const errorView = renderWithClient(
      <ConsentRoute>
        <div>Consent content</div>
      </ConsentRoute>
    );
    expect(screen.getByText("Consent content")).toBeInTheDocument();
    expect(session.getAccessToken).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    errorView.unmount();

    window.history.replaceState(null, "", "/auth/consent?request=abc");
    session.getAccessToken.mockResolvedValue(null);
    const signedOut = renderWithClient(
      <ConsentRoute>
        <div>Consent content</div>
      </ConsentRoute>
    );
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        "/auth/sign-in?returnTo=%2Fauth%2Fconsent%3Frequest%3Dabc"
      )
    );
    expect(screen.queryByText("Consent content")).not.toBeInTheDocument();
    signedOut.unmount();

    replace.mockReset();
    session.getAccessToken.mockResolvedValue("A1");
    renderWithClient(
      <ConsentRoute>
        <div>Consent content</div>
      </ConsentRoute>
    );
    expect(await screen.findByText("Consent content")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("AC-15 FR-MCP-005/D7: the consent page at ?request=abc (signed in), a 429 GET with retryAfterSeconds 30 → the rate-limit toast", async () => {
    window.history.replaceState(null, "", "/auth/consent?request=abc");
    session.getAccessToken.mockResolvedValue("A1");
    api.GET.mockResolvedValue({
      data: undefined,
      error: {
        type: "https://pm4.test/errors/rate-limited",
        title: "Too Many Requests",
        status: 429,
        detail: "Too many requests. Try again later.",
        retryAfterSeconds: 30
      },
      response: new Response(null, { status: 429 })
    });

    renderWithClient(<ConsentRoutePage />);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Too many requests. Try again in 30 seconds.",
        expect.anything()
      )
    );
  });
});
