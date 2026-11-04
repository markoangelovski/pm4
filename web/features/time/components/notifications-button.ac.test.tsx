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

const log = (
  id: string,
  durationMinutes: number,
  excludeFromStats = false
): TimeLog => ({
  id,
  workDate: "2026-10-09",
  durationMinutes,
  text: "Work",
  title: null,
  project: null,
  task: null,
  excludeFromStats
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

function renderBell({ meLoaded = true } = {}) {
  const queryClient = createQueryClient();
  // The shell has loaded the signed-in user.
  if (meLoaded) queryClient.setQueryData(["users", "me"], me);
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
const input = (label: string) =>
  screen.getByLabelText(label) as HTMLInputElement;
const duration = () => input("Duration");

/** The Log time dialog, once it is open. */
async function logTime() {
  const dialog = await screen.findByRole("dialog");
  expect(
    within(dialog).getByRole("heading", { name: "Log time" })
  ).toBeInTheDocument();
  return dialog;
}

const cancel = () =>
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
const noDialog = () =>
  waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

describe("NotificationsButton (feat-tlog-reminder, feat-tlog-billable-reminder, SCR-008)", () => {
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

  it("AC-3 FR-TLOG-021 SCR-008 (feat-tlog-billable-reminder D3 D4): 20m unlogged → Log time opens by itself for today with 15m; a new notification with the billable copy; the title prefix", async () => {
    // Start 08:00, 2h billable → 20m unlogged at 10:20.
    today = dayOf(480, [log("a", 60), log("b", 60)]);
    renderBell();
    const dialog = await logTime();
    expect(within(dialog).getByLabelText("Date")).toHaveTextContent(
      "9 Oct 2026"
    );
    await waitFor(() => expect(duration().value).toBe("15m"));
    expect(
      await screen.findByRole("button", {
        name: "Notifications (1 new)",
        hidden: true
      })
    ).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe("(1) Dashboard - PM4"));

    cancel();
    await noDialog();
    fireEvent.click(await bell("Notifications (1 new)"));
    expect(await screen.findByText("Log your time")).toBeInTheDocument();
    expect(
      screen.getByText("20m of billable time unlogged")
    ).toBeInTheDocument();
  });

  it("AC-4 FR-TLOG-021 SCR-008 (feat-tlog-billable-reminder D4): closing Log time keeps the reminder; Log your time opens it again with 15m; Dismiss clears the reminder, the dialog and the title prefix", async () => {
    today = dayOf(480, [log("a", 60), log("b", 60)]);
    renderBell();
    await logTime();
    cancel();
    await noDialog();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const trigger = await bell("Notifications (1 new)");
    expect(document.title).toBe("(1) Dashboard - PM4");

    fireEvent.click(trigger);
    fireEvent.click(await screen.findByText("Log your time"));
    await logTime();
    await waitFor(() => expect(duration().value).toBe("15m"));
    cancel();
    await noDialog();

    fireEvent.click(await bell("Notifications (1 new)"));
    await screen.findByText("Log your time");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(await bell("Notifications")).toBeInTheDocument();
    expect(await screen.findByText("No notifications.")).toBeInTheDocument();
    expect(screen.queryByText("Log your time")).not.toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe("Dashboard - PM4"));
    await new Promise((resolve) => setTimeout(resolve, 50));
    // The popover is a dialog too: no Log time.
    expect(
      screen.queryByRole("heading", { name: "Log time" })
    ).not.toBeInTheDocument();
  });

  it("AC-2 FR-TLOG-021 SCR-008 (feat-tlog-reminder-all-logged D1 D2): excluded logs fill the time since the start: 20m unlogged at 10:20", async () => {
    // Start 08:00, 1h billable + 1h excluded → 20m unlogged at 10:20.
    today = dayOf(480, [log("a", 60), log("b", 60, true)]);
    renderBell();
    await logTime();
    await waitFor(() => expect(duration().value).toBe("15m"));
    cancel();
    await noDialog();
    fireEvent.click(await bell("Notifications (1 new)"));
    expect(
      await screen.findByText("20m of billable time unlogged")
    ).toBeInTheDocument();
  });

  it("AC-2 FR-TLOG-021 SCR-008 (feat-tlog-reminder-all-logged D1 D2): at 11:20 1h 20m unlogged, Log time opens with 1h 15m; saving 30m → Log time opens again with 45m", async () => {
    // Start 08:00, 1h billable + 1h excluded → 1h 20m unlogged at 11:20.
    vi.setSystemTime(new Date("2026-10-09T09:20:00.000Z"));
    today = dayOf(480, [log("a", 60), log("b", 60, true)]);
    const saved = log("c", 30);
    api.POST.mockImplementation(async () => {
      today = dayOf(480, [...today.logs, saved]);
      return { data: saved, response: res(201) };
    });
    renderBell();
    await logTime();
    await waitFor(() => expect(duration().value).toBe("1h 15m"));
    expect(
      await screen.findByRole("button", {
        name: "Notifications (1 new)",
        hidden: true
      })
    ).toBeInTheDocument();

    fireEvent.change(input("Log text"), { target: { value: "Work" } });
    fireEvent.change(duration(), { target: { value: "30m" } });
    fireEvent.click(screen.getByRole("button", { name: "Log time" }));
    await waitFor(() => expect(api.POST).toHaveBeenCalledTimes(1));
    expect(api.POST).toHaveBeenCalledWith(
      "/api/v1/time-logs",
      expect.objectContaining({
        body: expect.objectContaining({
          workDate: "2026-10-09",
          durationMinutes: 30
        })
      })
    );

    // 2h 30m logged → 50m unlogged: it opens again with 45m.
    await waitFor(() => expect(duration().value).toBe("45m"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    cancel();
    await noDialog();
    fireEvent.click(await bell("Notifications (1 new)"));
    expect(
      await screen.findByText("50m of billable time unlogged")
    ).toBeInTheDocument();
  });

  it.each([
    ["no start", () => dayOf(null, [log("a", 60), log("b", 60)])],
    ["no logs", () => dayOf(480, [])],
    ["7h billable logged", () => dayOf(120, [log("a", 300), log("b", 120)])]
  ])(
    "AC-6 FR-TLOG-021 SCR-008 (feat-tlog-billable-reminder D3): %s → no notification, no dialog, no title prefix",
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
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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

  it("AC-12 SCR-008 (OQ-263): until the user loads, the bell has no notifications and loads no day; then it loads today in their time zone", async () => {
    // 2026-10-09 22:30 UTC is already 2026-10-10 00:30 in Zagreb.
    vi.setSystemTime(new Date("2026-10-09T22:30:00.000Z"));
    today = { ...dayOf(480, [log("a", 60)]), workDate: "2026-10-10" };
    let releaseMe!: () => void;
    const meHeld = new Promise<void>((resolve) => {
      releaseMe = resolve;
    });
    const routed = api.GET.getMockImplementation()!;
    api.GET.mockImplementation(async (path: string, options?: GetOptions) => {
      if (path === "/api/v1/me") await meHeld;
      return routed(path, options);
    });
    const daysRead = () =>
      api.GET.mock.calls
        .filter(([path]) => path === "/api/v1/workdays/{date}")
        .map(([, options]) => (options as GetOptions).params!.path!.date);

    renderBell({ meLoaded: false });
    expect(await bell("Notifications")).toBeInTheDocument();
    await waitFor(() =>
      expect(api.GET.mock.calls.some(([path]) => path === "/api/v1/me")).toBe(
        true
      )
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(daysRead()).toEqual([]);

    releaseMe();
    await waitFor(() => expect(daysRead()).toEqual(["2026-10-10"]));
    expect(document.title).toBe("Dashboard - PM4");
  });
});
