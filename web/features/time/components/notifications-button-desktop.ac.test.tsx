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
import type { DesktopNotificationsState } from "@/features/system/desktop-notifications";
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

const desktop = vi.hoisted(() => ({
  state: "on" as DesktopNotificationsState,
  turnOnDesktopNotifications: vi.fn(async () => "on" as const),
  turnOffDesktopNotifications: vi.fn(),
  showDesktopNotification: vi.fn(
    async (n: {
      title: string;
      body: string;
      tag: string;
      key?: string | null;
      onlyWhenAway?: boolean;
    }) => void n
  ),
  closeDesktopNotification: vi.fn(async (tag: string) => void tag)
}));
vi.mock("@/features/system/desktop-notifications", () => ({
  useDesktopNotifications: () => desktop.state,
  turnOnDesktopNotifications: desktop.turnOnDesktopNotifications,
  turnOffDesktopNotifications: desktop.turnOffDesktopNotifications,
  showDesktopNotification: desktop.showDesktopNotification,
  closeDesktopNotification: desktop.closeDesktopNotification
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

let today: Day;

const dayOf = (startMinute: number | null, logs: TimeLog[]): Day => ({
  workDate: "2026-10-09",
  startMinute,
  totalMinutes: logs.reduce((sum, l) => sum + l.durationMinutes, 0),
  logs
});

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
  queryClient.setQueryData(["users", "me"], me);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<NotificationsButton />, { wrapper });
}

/** Zagreb is UTC+2 on 2026-10-09. */
const zagreb = (hhmm: string) => new Date(`2026-10-09T${hhmm}:00.000+02:00`);

/** Moves "now" to `hhmm` and lets the bell's 15 s clock read it. */
async function at(hhmm: string) {
  vi.setSystemTime(zagreb(hhmm));
  await act(async () => {
    vi.advanceTimersByTime(15_000);
  });
}

const reminderCalls = () =>
  desktop.showDesktopNotification.mock.calls.map(([n]) => n);

const input = (label: string) =>
  screen.getByLabelText(label) as HTMLInputElement;

const offer = "Get a desktop notification when it's time to log.";

describe("NotificationsButton desktop notifications (feat-tlog-desktop-notifications, SCR-008)", () => {
  beforeEach(() => {
    // Date and the bell's 15 s interval are faked; timeouts stay real for waitFor and the queries.
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    vi.setSystemTime(zagreb("10:15"));
    Object.values(api).forEach((fn) => fn.mockReset());
    routeGet();
    setLastLogLink(NO_LOG_LINK);
    desktop.state = "on";
    desktop.showDesktopNotification.mockClear();
    desktop.closeDesktopNotification.mockClear();
    desktop.turnOnDesktopNotifications.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC-5 FR-TLOG-022 SCR-008 D2: one desktop notification per reminder step, keyed by day, since and step; closed when the reminder goes", async () => {
    // Start 08:00, 2h logged → 15m unlogged at 10:15.
    today = dayOf(480, [log("a", 60), log("b", 60)]);
    const saved = log("c", 30);
    api.POST.mockImplementation(async () => {
      today = dayOf(480, [...today.logs, saved]);
      return { data: saved, response: res(201) };
    });
    renderBell();

    await waitFor(() =>
      expect(desktop.showDesktopNotification).toHaveBeenCalledTimes(1)
    );
    expect(reminderCalls()[0]).toEqual({
      title: "Log your time",
      body: "15m of billable time unlogged",
      tag: "pm4-log-reminder",
      key: "2026-10-09|600|1",
      onlyWhenAway: true
    });

    // 10:16: still step 1 → no second notification.
    await at("10:16");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(desktop.showDesktopNotification).toHaveBeenCalledTimes(1);

    // 10:30: step 2.
    await at("10:30");
    await waitFor(() =>
      expect(desktop.showDesktopNotification).toHaveBeenCalledTimes(2)
    );
    expect(reminderCalls()[1]).toEqual({
      title: "Log your time",
      body: "30m of billable time unlogged",
      tag: "pm4-log-reminder",
      key: "2026-10-09|600|2",
      onlyWhenAway: true
    });
    expect(desktop.closeDesktopNotification).not.toHaveBeenCalled();

    // Saving 30m leaves no reminder → the notification is closed.
    await screen.findByRole("dialog");
    fireEvent.change(input("Log text"), { target: { value: "Work" } });
    fireEvent.change(input("Duration"), { target: { value: "30m" } });
    fireEvent.click(screen.getByRole("button", { name: "Log time" }));
    await waitFor(() => expect(api.POST).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(desktop.closeDesktopNotification).toHaveBeenCalledWith(
        "pm4-log-reminder"
      )
    );
    expect(desktop.showDesktopNotification).toHaveBeenCalledTimes(2);
  });

  it("AC-5 FR-TLOG-022 SCR-008: no reminder at mount → neither shown nor closed", async () => {
    today = dayOf(null, [log("a", 60), log("b", 60)]);
    renderBell();
    await waitFor(() =>
      expect(
        api.GET.mock.calls.some(([path]) => path === "/api/v1/workdays/{date}")
      ).toBe(true)
    );
    await Promise.all(api.GET.mock.results.map((r) => r.value));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(desktop.showDesktopNotification).not.toHaveBeenCalled();
    expect(desktop.closeDesktopNotification).not.toHaveBeenCalled();
  });

  it("AC-6 FR-TLOG-022 SCR-008: off → the popover offers Turn on, which turns them on", async () => {
    desktop.state = "off";
    today = dayOf(null, []);
    renderBell();
    fireEvent.click(
      await screen.findByRole("button", { name: "Notifications" })
    );
    expect(await screen.findByText(offer)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Turn on" }));
    expect(desktop.turnOnDesktopNotifications).toHaveBeenCalledTimes(1);
  });

  it.each(["on", "denied", "unsupported"] as const)(
    "AC-6 FR-TLOG-022 SCR-008: %s → no offer",
    async (state) => {
      desktop.state = state;
      today = dayOf(null, []);
      renderBell();
      fireEvent.click(
        await screen.findByRole("button", { name: "Notifications" })
      );
      expect(await screen.findByText("No notifications.")).toBeInTheDocument();
      expect(screen.queryByText(offer)).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Turn on" })
      ).not.toBeInTheDocument();
    }
  );
});
