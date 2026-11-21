import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import { formatShortDate } from "@/lib/time";
import type { Me } from "@/features/users/api";
import type { ConnectedApp } from "../api";
import { ConnectedAppsSettings } from "./connected-apps-settings";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://api.test";
});

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PATCH: vi.fn(),
  DELETE: vi.fn()
}));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

const toast = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() })
);
vi.mock("sonner", () => ({ toast }));

const TZ = "Europe/Zagreb";
const ADDRESS = `${process.env.NEXT_PUBLIC_API_BASE_URL}/mcp`;

const me: Me = {
  id: "0b6c7d2e-1f3a-4c5b-9d8e-7f6a5b4c3d2e",
  email: "marko@example.com",
  displayName: "Marko Angelovski",
  avatarUrl: null,
  timeZone: TZ,
  dailyTargetMinutes: 420,
  createdAt: "2026-10-02T22:30:00.000Z"
};

const claude: ConnectedApp = {
  id: "g1",
  client: { name: "Claude Code", clientIdHost: "claude.ai" },
  scopes: ["pm4:read", "pm4:write"],
  connectedAt: "2026-11-01T10:00:00Z",
  lastUsedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  expired: false
};
const opencode: ConnectedApp = {
  id: "g2",
  client: { name: "OpenCode", clientIdHost: "opencode.ai" },
  scopes: ["pm4:read"],
  connectedAt: "2026-10-02T22:30:00Z",
  lastUsedAt: null,
  expired: false
};

const res = (status: number) => new Response(null, { status });
const problem = (status: number) => ({
  type: `https://pm4.example/problems/${status}`,
  title: "Problem",
  status,
  detail: "Problem"
});

function listAnswers(...answers: unknown[]) {
  const queue = [...answers];
  api.GET.mockImplementation(async (path: string) => {
    if (path === "/api/v1/me") return { data: me, response: res(200) };
    const next = queue.length > 1 ? queue.shift() : queue[0];
    return next;
  });
}
const ok = (items: ConnectedApp[]) => ({
  data: { items },
  response: res(200)
});
const failed = { error: problem(500), response: res(500) };
const listCalls = () =>
  api.GET.mock.calls.filter((c) => c[0] === "/api/v1/connected-apps").length;

function renderSettings() {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({
    ...queryClient.getDefaultOptions(),
    queries: { ...queryClient.getDefaultOptions().queries, retry: false }
  });
  queryClient.setQueryData(["users", "me"], me);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<ConnectedAppsSettings />, { wrapper });
}

const rowOf = (name: string) =>
  screen.getByText(name).closest("li") as HTMLElement;
const address = () => screen.getByRole("textbox") as HTMLInputElement;

describe("Connected apps settings (feat-mcp-web)", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    toast.success.mockReset();
    toast.error.mockReset();
  });

  it("AC-16 FR-MCP-009: each app shows name, access, host, Connected date and last use; null → Not used yet; expired → Expired and no Last used", async () => {
    listAnswers(ok([claude, opencode]));
    const first = renderSettings();
    await screen.findByText("Claude Code");

    const items = screen.getAllByText(/^(Claude Code|OpenCode)$/);
    expect(items.map((el) => el.textContent)).toEqual([
      "Claude Code",
      "OpenCode"
    ]);

    const a = within(rowOf("Claude Code"));
    expect(a.getByText("Read and write")).toBeInTheDocument();
    expect(a.getByText("claude.ai")).toBeInTheDocument();
    expect(
      a.getByText(`Connected ${formatShortDate(claude.connectedAt, TZ)}`)
    ).toBeInTheDocument();
    expect(a.getByText(/Last used .+ ago/)).toBeInTheDocument();

    const b = within(rowOf("OpenCode"));
    expect(b.getByText("Read only")).toBeInTheDocument();
    expect(b.getByText("opencode.ai")).toBeInTheDocument();
    expect(
      b.getByText(`Connected ${formatShortDate(opencode.connectedAt, TZ)}`)
    ).toBeInTheDocument();
    expect(b.getByText(/Not used yet/)).toBeInTheDocument();
    expect(b.queryByText(/Last used/)).not.toBeInTheDocument();
    first.unmount();

    listAnswers(ok([{ ...claude, expired: true }]));
    renderSettings();
    await screen.findByText("Claude Code");
    const expired = within(rowOf("Claude Code"));
    expect(
      expired.getByText("Expired — reconnect from the app")
    ).toBeInTheDocument();
    expect(expired.queryByText(/Last used/)).not.toBeInTheDocument();
  });

  it("AC-17 FR-MCP-009: no apps → No connected apps; a load error → message and Retry refetches; the server address shows in all three states", async () => {
    listAnswers(ok([claude]));
    const withApps = renderSettings();
    await screen.findByText("Claude Code");
    expect(address().value).toBe(ADDRESS);
    withApps.unmount();

    listAnswers(ok([]));
    const empty = renderSettings();
    expect(await screen.findByText("No connected apps")).toBeInTheDocument();
    expect(address().value).toBe(ADDRESS);
    empty.unmount();

    listAnswers(failed, ok([claude]));
    renderSettings();
    expect(
      await screen.findByText("Couldn't load your connected apps.")
    ).toBeInTheDocument();
    expect(address().value).toBe(ADDRESS);
    expect(listCalls()).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(listCalls()).toBe(2));
    expect(await screen.findByText("Claude Code")).toBeInTheDocument();
  });

  it("AC-18 OQ-300: the address is NEXT_PUBLIC_API_BASE_URL/mcp; Copy writes it and reads Copied; a rejected write → toast", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true
    });
    listAnswers(ok([]));
    const first = renderSettings();
    await screen.findByText("No connected apps");
    expect(address().value).toBe(`${process.env.NEXT_PUBLIC_API_BASE_URL}/mcp`);
    fireEvent.click(screen.getByRole("button", { name: /^Copy/ }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(ADDRESS));
    expect(await screen.findByText("Copied")).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
    first.unmount();

    const rejected = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: rejected },
      configurable: true
    });
    renderSettings();
    await screen.findByText("No connected apps");
    fireEvent.click(screen.getByRole("button", { name: /^Copy/ }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Couldn't copy to the clipboard."
      )
    );
  });

  it("AC-19 FR-MCP-009: Revoke asks first; confirming revokes with the id, toasts and closes; a failure toasts and keeps the dialog; Cancel revokes nothing", async () => {
    listAnswers(ok([claude]));
    api.DELETE.mockResolvedValue({ response: res(204) });
    const first = renderSettings();
    await screen.findByText("Claude Code");

    fireEvent.click(
      within(rowOf("Claude Code")).getByRole("button", { name: "Revoke" })
    );
    let dialog = await screen.findByRole("alertdialog", {
      name: "Revoke Claude Code?"
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Revoke" }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Claude Code disconnected")
    );
    expect(api.DELETE).toHaveBeenCalledTimes(1);
    expect(api.DELETE).toHaveBeenCalledWith(
      "/api/v1/connected-apps/{id}",
      expect.objectContaining({ params: { path: { id: "g1" } } })
    );
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    );
    first.unmount();

    api.DELETE.mockReset();
    api.DELETE.mockResolvedValue({ error: problem(500), response: res(500) });
    const failing = renderSettings();
    await screen.findByText("Claude Code");
    fireEvent.click(
      within(rowOf("Claude Code")).getByRole("button", { name: "Revoke" })
    );
    dialog = await screen.findByRole("alertdialog", {
      name: "Revoke Claude Code?"
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Revoke" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't revoke the app.")
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    failing.unmount();

    api.DELETE.mockReset();
    toast.success.mockReset();
    renderSettings();
    await screen.findByText("Claude Code");
    fireEvent.click(
      within(rowOf("Claude Code")).getByRole("button", { name: "Revoke" })
    );
    dialog = await screen.findByRole("alertdialog", {
      name: "Revoke Claude Code?"
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    );
    expect(api.DELETE).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
