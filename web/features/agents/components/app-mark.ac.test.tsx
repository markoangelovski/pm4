import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentType, ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import type { Me } from "@/features/users/api";
import type { ConnectedApp } from "../api";
import { AppMark as AppMarkBase } from "./app-mark";
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

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() })
}));

// `logoUri` joins the generated `ConnectedApp` type when T-0185 regenerates it; the intersection types both states.
type WithLogo = ConnectedApp & { logoUri: string | null };
const AppMark = AppMarkBase as ComponentType<{
  name: string;
  logoUri?: string | null;
  className?: string;
}>;

const LOGO = "https://claude.ai/logo.png";

const me: Me = {
  id: "0b6c7d2e-1f3a-4c5b-9d8e-7f6a5b4c3d2e",
  email: "marko@example.com",
  displayName: "Marko Angelovski",
  avatarUrl: null,
  timeZone: "Europe/Zagreb",
  dailyTargetMinutes: 420,
  createdAt: "2026-10-02T22:30:00.000Z"
};

const withLogo: WithLogo = {
  id: "g1",
  client: { name: "Claude Code", clientIdHost: "claude.ai" },
  scopes: ["pm4:read", "pm4:write"],
  connectedAt: "2026-11-01T10:00:00Z",
  lastUsedAt: null,
  expired: false,
  logoUri: LOGO
};
const withoutLogo: WithLogo = {
  id: "g2",
  client: { name: "OpenCode", clientIdHost: "opencode.ai" },
  scopes: ["pm4:read"],
  connectedAt: "2026-10-02T22:30:00Z",
  lastUsedAt: null,
  expired: false,
  logoUri: null
};

const res = (status: number) => new Response(null, { status });

function renderSettings(items: WithLogo[]) {
  api.GET.mockImplementation(async (path: string) =>
    path === "/api/v1/me"
      ? { data: me, response: res(200) }
      : { data: { items }, response: res(200) }
  );
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

describe("App logos (feat-mcp-logos)", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
  });

  it("AC-10 FR-MCP-003: AppMark without logoUri (or null) shows the letter and no <img>", () => {
    const first = render(<AppMark name="Claude Code" />);
    expect(first.container.querySelector("img")).toBeNull();
    expect(screen.getByText("C")).toBeInTheDocument();
    first.unmount();

    const second = render(<AppMark name="Claude Code" logoUri={null} />);
    expect(second.container.querySelector("img")).toBeNull();
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("AC-11 FR-MCP-003: AppMark with logoUri renders an <img> with that src and no-referrer; the letter shows until load and is gone after", () => {
    const { container } = render(<AppMark name="Claude Code" logoUri={LOGO} />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("src", LOGO);
    expect(img).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(screen.getByText("C")).toBeInTheDocument();

    fireEvent.load(img as HTMLImageElement);
    expect(screen.queryByText("C")).not.toBeInTheDocument();
  });

  it("AC-12 FR-MCP-003: AppMark whose logo image fires error keeps the letter", () => {
    const { container } = render(<AppMark name="Claude Code" logoUri={LOGO} />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();

    fireEvent.error(img as HTMLImageElement);
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("AC-13 FR-MCP-003: Connected apps renders an <img> with the item's logoUri, and none for an item with logoUri null", async () => {
    renderSettings([withLogo, withoutLogo]);
    await screen.findByText("Claude Code");

    const rowOf = (name: string) =>
      screen.getByText(name).closest("li") as HTMLElement;

    const imgs = rowOf("Claude Code").querySelectorAll("img");
    expect(imgs).toHaveLength(1);
    expect(imgs[0]).toHaveAttribute("src", LOGO);

    expect(within(rowOf("OpenCode")).queryByRole("img")).toBeNull();
    expect(rowOf("OpenCode").querySelector("img")).toBeNull();
  });
});
