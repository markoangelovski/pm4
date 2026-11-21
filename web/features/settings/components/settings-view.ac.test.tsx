import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { createQueryClient } from "@/lib/query-client";
import type { Me } from "@/features/users/api";
import { SettingsView } from "./settings-view";

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PATCH: vi.fn(),
  DELETE: vi.fn()
}));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/app/settings",
  useSearchParams: () => new URLSearchParams()
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() })
}));

const me: Me = {
  id: "0b6c7d2e-1f3a-4c5b-9d8e-7f6a5b4c3d2e",
  email: "marko@example.com",
  displayName: "Marko Angelovski",
  avatarUrl: null,
  timeZone: "Europe/Zagreb",
  dailyTargetMinutes: 420,
  createdAt: "2026-10-02T22:30:00.000Z"
};

function renderSettings(searchParams?: string) {
  const queryClient = createQueryClient();
  queryClient.setQueryData(["users", "me"], me);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <NuqsTestingAdapter hasMemory searchParams={searchParams}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </NuqsTestingAdapter>
  );
  return render(<SettingsView />, { wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  api.GET.mockImplementation(async (path: string) => ({
    data: path === "/api/v1/connected-apps" ? { items: [] } : {},
    response: new Response(null, { status: 200 })
  }));
});

describe("SettingsView tabs (feat-mcp-web)", () => {
  it("AC-20 FR-MCP-009/OQ-292: lists the tabs User settings, Integrations, Connected apps in that order", () => {
    renderSettings();
    const tabs = screen.getAllByRole("tab").map((t) => t.textContent?.trim());
    expect(tabs).toEqual(["User settings", "Integrations", "Connected apps"]);
  });

  it("AC-20 FR-MCP-009/OQ-292: ?tab=connected-apps selects the last tab and shows the Connected apps card", async () => {
    renderSettings("?tab=connected-apps");
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(tabs[2]).toHaveAttribute("aria-selected", "true");
    expect(tabs[0]).toHaveAttribute("aria-selected", "false");
    await waitFor(() => {
      const title = document.querySelector('[data-slot="card-title"]');
      expect(title?.textContent).toBe("Connected apps");
    });
  });
});
