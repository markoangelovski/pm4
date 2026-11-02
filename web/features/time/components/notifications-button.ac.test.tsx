import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
import type { Me } from "@/features/users/api";
import { NO_LOG_LINK, setLastLogLink } from "../last-log-link";
import type { Day, TimeLog } from "../types";
import { NotificationsButton } from "./notifications-button";

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PATCH: vi.fn(),
  PUT: vi.fn()
}));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/app",
  useSearchParams: () => new URLSearchParams()
}));

const toast = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() })
);
vi.mock("sonner", () => ({ toast }));

const me: Me = {
  id: "0b6c7d2e-1f3a-4c5b-9d8e-7f6a5b4c3d2e",
  email: "marko@example.com",
  displayName: "Marko Angelovski",
  avatarUrl: null,
  timeZone: "Europe/Zagreb",
  dailyTargetMinutes: 420,
  createdAt: "2026-10-02T22:30:00.000Z"
};

const log = (id: string, durationMinutes: number): TimeLog => ({
  id,
  workDate: "2026-10-09",
  durationMinutes,
  text: "Work",
  title: null,
  project: null,
  task: null,
  excludeFromStats: false
});

const res = (status: number) => new Response(null, { status });

/** Today's day (2026-10-09); set per test. */
let today: Day;

type GetOptions = { params?: { path?: Record<string, string> } };

function routeGet() {
  api.GET.mockImplementation(async (path: string, options?: GetOptions) => {
    if (path === "/api/v1/me") return { data: me, response: res(200) };
    if (path === "/api/v1/workdays/{date}") {
      const date = options!.params!.path!.date;
      if (date !== today.workDate) throw new Error(`unexpected day ${date}`);
      return { data: today, response: res(200) };
    }
    if (path === "/api/v1/projects" || path === "/api/v1/tasks") {
      return {
        data: { items: [], total: 0, page: 1, pageSize: 100 },
        response: res(200)
      };
    }
    throw new Error(`unexpected GET ${path}`);
  });
}

function renderBell() {
  const queryClient = createQueryClient();
  // The shell has loaded the signed-in user.
  queryClient.setQueryData(["users", "me"], me);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<NotificationsButton />, { wrapper });
}

const dayOf = (startMinute: number | null, logs: TimeLog[]): Day => ({
  workDate: "2026-10-09",
  startMinute,
  totalMinutes: logs.reduce((sum, l) => sum + l.durationMinutes, 0),
  logs
});

const bell = (name: string) => screen.findByRole("button", { name });

describe("NotificationsButton (feat-tlog-reminder, SCR-008)", () => {
  beforeEach(() => {
    // "Now" is 2026-10-09 10:20 in Zagreb; only Date is faked, timers stay real.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-09T08:20:00.000Z"));
    Object.values(api).forEach((fn) => fn.mockReset());
    routeGet();
    setLastLogLink(NO_LOG_LINK);
    document.title = "Dashboard - PM4";
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC-2 FR-TLOG-021 SCR-008: 20m unlogged → a new notification, the title prefix; Dismiss clears both; Log your time opens Log time for today", async () => {
    // Start 08:00, 2h logged → unlogged since 10:00.
    today = dayOf(480, [log("a", 60), log("b", 60)]);
    const first = renderBell();
    const trigger = await bell("Notifications (1 new)");
    await waitFor(() => expect(document.title).toBe("(1) Dashboard - PM4"));

    fireEvent.click(trigger);
    const item = await screen.findByText("Log your time");
    expect(screen.getByText("20m unlogged since 10:00")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(await bell("Notifications")).toBeInTheDocument();
    expect(await screen.findByText("No notifications.")).toBeInTheDocument();
    expect(screen.queryByText("Log your time")).not.toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe("Dashboard - PM4"));
    expect(item).not.toBeInTheDocument();
    first.unmount();

    // A new mount (a reload) shows it again; clicking it opens Log time for today.
    renderBell();
    fireEvent.click(await bell("Notifications (1 new)"));
    fireEvent.click(await screen.findByText("Log your time"));
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Log time" })
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Date")).toHaveTextContent(
      "9 Oct 2026"
    );
  });

  it.each([
    ["no start", () => dayOf(null, [log("a", 60), log("b", 60)])],
    ["no logs", () => dayOf(480, [])],
    ["7h logged", () => dayOf(120, [log("a", 300), log("b", 120)])]
  ])(
    "AC-3 FR-TLOG-021 SCR-008: %s → no notification, no title prefix",
    async (_, make) => {
      today = make();
      renderBell();
      // Let today's day load, so the hidden reminder is the rule's doing, not a pending request.
      await waitFor(() =>
        expect(
          api.GET.mock.calls.some(
            ([path]) => path === "/api/v1/workdays/{date}"
          )
        ).toBe(true)
      );
      await Promise.all(api.GET.mock.results.map((r) => r.value));
      await new Promise((resolve) => setTimeout(resolve, 50));
      const trigger = await bell("Notifications");
      fireEvent.click(trigger);
      expect(await screen.findByText("No notifications.")).toBeInTheDocument();
      expect(screen.queryByText("Log your time")).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Notifications" })
      ).toBeInTheDocument();
      expect(document.title).toBe("Dashboard - PM4");
    }
  );
});
