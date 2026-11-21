import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import type { ConsentRequest } from "../api";
import { ConsentPage } from "./consent-page";

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PUT: vi.fn(),
  PATCH: vi.fn(),
  DELETE: vi.fn()
}));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

const toast = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() })
);
vi.mock("sonner", () => ({ toast }));

const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  search: "request=abc"
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: nav.replace,
    push: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
    forward: vi.fn()
  }),
  useSearchParams: () => new URLSearchParams(nav.search),
  usePathname: () => "/auth/consent"
}));

const session = vi.hoisted(() => ({ signOut: vi.fn() }));
vi.mock("@/lib/auth/session", () => session);

const assign = vi.fn();

// The texts of `SCOPE_TEXT` (features/agents/scopes.ts, FR-MCP-008).
const READ_TEXT = "Read your projects, tasks, logged time and reports";
const WRITE_TEXT =
  "Log time, edit your time logs, create tasks, change a task's status and set your workday start";

const me = {
  id: "u1",
  displayName: "Ada Lovelace",
  email: "ada@example.com",
  avatarUrl: null,
  timeZone: "Europe/Zagreb",
  dailyTargetMinutes: 420,
  createdAt: "2026-01-01T00:00:00Z"
};

const inMinutes = (m: number) =>
  new Date(Date.now() + m * 60_000).toISOString();

const request = (over: Partial<ConsentRequest> = {}): ConsentRequest => ({
  id: "abc",
  client: { name: "Claude Code", clientIdHost: "claude.ai" },
  redirectHost: "127.0.0.1:40000",
  loopback: true,
  scopes: ["pm4:read", "pm4:write"],
  existingGrant: { connectedAt: "2026-11-01T10:00:00Z" },
  expiresAt: inMinutes(10),
  ...over
});

const res = (status: number) => new Response(null, { status });
const problem = (status: number) => ({
  type: `https://pm4.example/problems/${status}`,
  title: "Problem",
  status,
  detail: "Problem"
});

/** The GET answers: the consent request (or its error status) and `/api/v1/me`. */
function answerGet(consent: ConsentRequest | number) {
  api.GET.mockImplementation(async (path: string) => {
    if (path === "/api/v1/me") return { data: me, response: res(200) };
    if (typeof consent === "number")
      return { error: problem(consent), response: res(consent) };
    return { data: consent, response: res(200) };
  });
}

function renderPage() {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({
    ...queryClient.getDefaultOptions(),
    queries: { ...queryClient.getDefaultOptions().queries, retry: false }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConsentPage />
    </QueryClientProvider>
  );
}

const heading = (name: string) => screen.findByRole("heading", { name });

describe("consent page (feat-mcp-web)", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    toast.mockReset();
    toast.error.mockReset();
    toast.success.mockReset();
    nav.replace.mockReset();
    nav.search = "request=abc";
    session.signOut.mockReset();
    session.signOut.mockResolvedValue(undefined);
    assign.mockReset();
    vi.stubGlobal("location", { ...window.location, assign });
  });

  it("AC-7 FR-MCP-003/D5: ?error= and a missing request show the error page without calling the API, each with Open PM4 → /app", async () => {
    const cases: [string, string][] = [
      ["error=invalid_client", "PM4 couldn't verify this app"],
      [
        "error=invalid_redirect_uri",
        "This app asked to return somewhere it isn't allowed to"
      ],
      ["error=other", "This request isn't valid"],
      ["", "This request isn't valid"]
    ];
    for (const [search, title] of cases) {
      nav.search = search;
      const view = renderPage();
      expect(await heading(title)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Open PM4" })).toHaveAttribute(
        "href",
        "/app"
      );
      expect(api.GET).not.toHaveBeenCalled();
      expect(api.POST).not.toHaveBeenCalled();
      view.unmount();
    }
  });

  it("AC-8 FR-MCP-005: a request the GET answers 404 shows 'This request isn't valid'", async () => {
    answerGet(404);
    renderPage();
    expect(await heading("This request isn't valid")).toBeInTheDocument();
  });

  it("AC-9 FR-MCP-005: shows who asks, for which account and what it may do; a remote, new, read-only request has no warning, no 'Already connected' and only the read line", async () => {
    answerGet(request());
    const first = renderPage();
    expect(
      await heading("Allow Claude Code to use your PM4 account?")
    ).toBeInTheDocument();
    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByText("claude.ai")).toBeInTheDocument();
    expect(screen.getAllByText(/127\.0\.0\.1:40000/).length).toBeGreaterThan(0);
    expect(
      screen.getByText("This app runs on this computer")
    ).toBeInTheDocument();
    expect(screen.getByText(/Already connected since/)).toBeInTheDocument();
    expect(await screen.findByText("1 November 2026")).toBeInTheDocument();
    expect(screen.getByText(READ_TEXT)).toBeInTheDocument();
    expect(screen.getByText(WRITE_TEXT)).toBeInTheDocument();
    expect(screen.getByText("It can't delete anything.")).toBeInTheDocument();
    first.unmount();

    answerGet(
      request({ loopback: false, existingGrant: null, scopes: ["pm4:read"] })
    );
    renderPage();
    await heading("Allow Claude Code to use your PM4 account?");
    expect(screen.queryByText("This app runs on this computer")).toBeNull();
    expect(screen.queryByText(/Already connected/)).toBeNull();
    expect(screen.getByText(READ_TEXT)).toBeInTheDocument();
    expect(screen.queryByText(WRITE_TEXT)).toBeNull();
  });

  it("AC-10 FR-MCP-005: Allow sends the allow mutation once and goes to its redirectUrl with both buttons disabled; Deny goes to the deny redirectUrl", async () => {
    answerGet(request());
    api.POST.mockResolvedValue({
      data: { redirectUrl: "http://127.0.0.1:40000/cb?code=x" },
      response: res(200)
    });
    const allowView = renderPage();
    await heading("Allow Claude Code to use your PM4 account?");
    fireEvent.click(screen.getByRole("button", { name: "Allow" }));
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith("http://127.0.0.1:40000/cb?code=x")
    );
    expect(api.POST).toHaveBeenCalledTimes(1);
    expect(api.POST).toHaveBeenCalledWith(
      "/api/v1/oauth/consent/{requestId}/allow",
      expect.objectContaining({ params: { path: { requestId: "abc" } } })
    );
    expect(screen.getByRole("button", { name: "Allow" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Deny" })).toBeDisabled();
    expect(
      screen.getByText("Returning you to Claude Code…")
    ).toBeInTheDocument();
    allowView.unmount();

    assign.mockReset();
    api.POST.mockReset();
    api.POST.mockResolvedValue({
      data: { redirectUrl: "http://127.0.0.1:40000/cb?error=access_denied" },
      response: res(200)
    });
    renderPage();
    await heading("Allow Claude Code to use your PM4 account?");
    fireEvent.click(screen.getByRole("button", { name: "Deny" }));
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith(
        "http://127.0.0.1:40000/cb?error=access_denied"
      )
    );
    expect(api.POST).toHaveBeenCalledTimes(1);
    expect(api.POST).toHaveBeenCalledWith(
      "/api/v1/oauth/consent/{requestId}/deny",
      expect.objectContaining({ params: { path: { requestId: "abc" } } })
    );
  });

  it("AC-11 FR-MCP-005: a past expiresAt shows 'This request has expired' without Allow; Allow answering 410 shows the same view", async () => {
    answerGet(request({ expiresAt: inMinutes(-1) }));
    const past = renderPage();
    expect(await heading("This request has expired")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Allow" })).toBeNull();
    past.unmount();

    answerGet(request());
    api.POST.mockResolvedValue({ error: problem(410), response: res(410) });
    renderPage();
    await heading("Allow Claude Code to use your PM4 account?");
    fireEvent.click(screen.getByRole("button", { name: "Allow" }));
    expect(await heading("This request has expired")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Allow" })).toBeNull();
  });

  it("AC-12 D6: Allow answering 404 shows 'This request isn't valid' with no toast; 500 toasts and keeps the form; 429 shows no such toast", async () => {
    answerGet(request());
    api.POST.mockResolvedValue({ error: problem(404), response: res(404) });
    const gone = renderPage();
    await heading("Allow Claude Code to use your PM4 account?");
    fireEvent.click(screen.getByRole("button", { name: "Allow" }));
    expect(await heading("This request isn't valid")).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
    gone.unmount();

    api.POST.mockReset();
    api.POST.mockResolvedValue({ error: problem(500), response: res(500) });
    const failed = renderPage();
    await heading("Allow Claude Code to use your PM4 account?");
    fireEvent.click(screen.getByRole("button", { name: "Allow" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Couldn't send your answer. Try again."
      )
    );
    expect(
      screen.getByRole("heading", {
        name: "Allow Claude Code to use your PM4 account?"
      })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Allow" })).toBeEnabled();
    failed.unmount();

    toast.error.mockReset();
    api.POST.mockReset();
    api.POST.mockResolvedValue({ error: problem(429), response: res(429) });
    renderPage();
    await heading("Allow Claude Code to use your PM4 account?");
    fireEvent.click(screen.getByRole("button", { name: "Allow" }));
    await waitFor(() => expect(api.POST).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Allow" })).toBeEnabled()
    );
    expect(toast.error).not.toHaveBeenCalledWith(
      "Couldn't send your answer. Try again."
    );
  });

  it("AC-13 OQ-299: Use another account signs out, then replaces to the sign-in page returning to this request", async () => {
    answerGet(request());
    renderPage();
    await heading("Allow Claude Code to use your PM4 account?");
    fireEvent.click(
      await screen.findByRole("button", { name: "Use another account" })
    );
    await waitFor(() =>
      expect(nav.replace).toHaveBeenCalledWith(
        "/auth/sign-in?returnTo=%2Fauth%2Fconsent%3Frequest%3Dabc"
      )
    );
    expect(session.signOut).toHaveBeenCalledTimes(1);
    expect(session.signOut.mock.invocationCallOrder[0]).toBeLessThan(
      nav.replace.mock.invocationCallOrder[0]
    );
  });
});
