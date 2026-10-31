import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";
import type { ComponentProps, ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { createQueryClient } from "@/lib/query-client";
import type { components } from "@/lib/api/schema";
import type { Me } from "@/features/users/api";
import type { Day, TimeLog } from "../types";
import { DayMenu } from "./day-menu";
import { DayView } from "./day-view";

type S = components["schemas"];
type PmspaAction = NonNullable<ComponentProps<typeof DayMenu>["push"]>;

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PUT: vi.fn(),
  PATCH: vi.fn(),
  DELETE: vi.fn()
}));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/app/time",
  useSearchParams: () => new URLSearchParams()
}));

// A plain anchor keeps the exact href (next.config isn't loaded in Vitest).
vi.mock("next/link", () => ({
  default: ({ href, ...props }: { href: string } & ComponentProps<"a">) => (
    <a href={href} {...props} />
  )
}));

const toast = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() })
);
vi.mock("sonner", () => ({ toast }));

const log = (workDate: string, id = "l1"): TimeLog => ({
  id,
  workDate,
  durationMinutes: 60,
  text: "Work",
  title: null,
  project: null,
  task: null,
  excludeFromStats: false
});

const dayOf = (workDate: string, logs: TimeLog[]): Day => ({
  workDate,
  startMinute: 480,
  totalMinutes: logs.reduce((sum, l) => sum + l.durationMinutes, 0),
  logs
});

const withLogs = (workDate: string) => dayOf(workDate, [log(workDate)]);

const action = (over: Partial<PmspaAction> = {}): PmspaAction => ({
  hidden: false,
  mode: "push",
  label: "Push to PMSPA",
  disabled: false,
  hint: undefined,
  start: vi.fn(),
  dialog: null,
  ...over
});

function renderWith(ui: ReactNode) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

const openMenu = () =>
  fireEvent.click(screen.getByRole("button", { name: "Day actions" }));

const item = (name: string) => screen.findByRole("menuitem", { name });

/** The Go to Bookings item's link (the item itself, or the anchor inside it). */
async function bookingsLink() {
  const el = await item("Go to Bookings");
  return el.closest("a") ?? el.querySelector("a") ?? el;
}

describe("Day menu (feat-tlog-day-menu)", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    api.GET.mockImplementation((path: string) => {
      throw new Error(`unexpected GET ${path}`);
    });
  });

  it("AC-1 SCR-040: the menu lists Go to Bookings, Prompt, Push to PMSPA, Delete day, in that order", async () => {
    renderWith(
      <DayMenu
        day={withLogs("2026-10-06")}
        today="2026-10-31"
        push={action()}
      />
    );
    openMenu();
    await item("Go to Bookings");
    expect(
      screen.getAllByRole("menuitem").map((el) => el.textContent?.trim())
    ).toEqual(["Go to Bookings", "Prompt", "Push to PMSPA", "Delete day"]);
    // The menu reads nothing from the API itself.
    expect(api.GET).not.toHaveBeenCalled();
  });

  it.each([
    [
      "2026-09-15",
      "2026-10-31",
      "/app/bookings?from=2026-09-01&to=2026-09-30#day-2026-09-15"
    ],
    [
      "2026-10-07",
      "2026-10-20",
      "/app/bookings?from=2026-10-01&to=2026-10-20#day-2026-10-07"
    ],
    [
      "2026-11-03",
      "2026-10-31",
      "/app/bookings?from=2026-11-01&to=2026-11-03#day-2026-11-03"
    ]
  ])(
    "AC-2 OQ-252: day %s, today %s → Go to Bookings links to %s",
    async (date, today, href) => {
      renderWith(<DayMenu day={withLogs(date)} today={today} />);
      openMenu();
      const link = await bookingsLink();
      expect(link).toHaveAttribute("href", href);
    }
  );

  it("AC-3 OQ-252: Go to Bookings is disabled on a day without logs, as Prompt", async () => {
    renderWith(<DayMenu day={dayOf("2026-10-06", [])} today="2026-10-31" />);
    openMenu();
    expect(await item("Go to Bookings")).toHaveAttribute(
      "aria-disabled",
      "true"
    );
    expect(await item("Prompt")).toHaveAttribute("aria-disabled", "true");
  });

  it("AC-4 FR-INT-012: Push to PMSPA hidden without push or when hidden; disabled with the hint as its title; enabled → push.start", async () => {
    const day = withLogs("2026-10-06");
    const none = renderWith(<DayMenu day={day} today="2026-10-31" />);
    openMenu();
    await item("Prompt");
    expect(
      screen.queryByRole("menuitem", { name: "Push to PMSPA" })
    ).not.toBeInTheDocument();
    none.unmount();

    const hidden = renderWith(
      <DayMenu day={day} today="2026-10-31" push={action({ hidden: true })} />
    );
    openMenu();
    await item("Prompt");
    expect(
      screen.queryByRole("menuitem", { name: "Push to PMSPA" })
    ).not.toBeInTheDocument();
    hidden.unmount();

    const hint = "PMSPA: Error. Check it in Settings → Integrations.";
    const disabled = renderWith(
      <DayMenu
        day={day}
        today="2026-10-31"
        push={action({ disabled: true, hint })}
      />
    );
    openMenu();
    const off = await item("Push to PMSPA");
    expect(off).toHaveAttribute("aria-disabled", "true");
    expect(off).toHaveAttribute("title", hint);
    disabled.unmount();

    const push = action();
    renderWith(<DayMenu day={day} today="2026-10-31" push={push} />);
    openMenu();
    fireEvent.click(await item("Push to PMSPA"));
    expect(push.start).toHaveBeenCalledTimes(1);
  });
});

const me: Me = {
  id: "0b6c7d2e-1f3a-4c5b-9d8e-7f6a5b4c3d2e",
  email: "marko@example.com",
  displayName: "Marko Angelovski",
  avatarUrl: null,
  timeZone: "Europe/Zagreb",
  dailyTargetMinutes: 420,
  createdAt: "2026-10-02T22:30:00.000Z"
};

const connection: S["PmspaConnectionResponseDto"] = {
  status: "connected",
  url: "https://pmspa.example.com",
  email: "me@example.com",
  account: {
    id: "u1",
    email: "me@example.com",
    avatarUrl: null,
    role: "user"
  },
  lastCheckedAt: "2026-10-07T06:00:00.000Z",
  lastSyncAt: null,
  rateLimit: null
};

const res = (status: number) => new Response(null, { status });

describe("Day view's Push to PMSPA (feat-tlog-day-menu)", () => {
  beforeAll(() => {
    // recharts' ResponsiveContainer needs it; jsdom has none.
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  beforeEach(() => {
    // Today is 2026-10-07 in Zagreb; only Date is faked, timers stay real.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-07T07:17:00.000Z"));
    Object.values(api).forEach((fn) => fn.mockReset());
    api.GET.mockImplementation(async (path: string) => {
      if (path === "/api/v1/me") return { data: me, response: res(200) };
      if (path === "/api/v1/workdays/{date}") {
        return { data: withLogs("2026-10-07"), response: res(200) };
      }
      if (path === "/api/v1/workdays") {
        return { data: { items: [] }, response: res(200) };
      }
      if (path === "/api/v1/projects" || path === "/api/v1/tasks") {
        return {
          data: { items: [], total: 0, page: 1, pageSize: 100 },
          response: res(200)
        };
      }
      if (path === "/api/v1/integrations/pmspa") {
        return { data: connection, response: res(200) };
      }
      throw new Error(`unexpected GET ${path}`);
    });
    api.POST.mockImplementation(async () => ({
      data: { items: [] } satisfies S["SyncPreviewDto"],
      response: res(200)
    }));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC-5 FR-INT-012: no Push to PMSPA button outside the menu; the menu item posts the day's preview and its dialog outlives the menu", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(["users", "me"], me);
    render(
      <NuqsTestingAdapter searchParams="">
        <QueryClientProvider client={queryClient}>
          <DayView />
        </QueryClientProvider>
      </NuqsTestingAdapter>
    );
    await screen.findByText("Wednesday, 7 October 2026");
    await waitFor(() =>
      expect(api.GET).toHaveBeenCalledWith(
        "/api/v1/integrations/pmspa",
        expect.anything()
      )
    );
    expect(
      screen.queryByRole("button", { name: /Push to PMSPA/ })
    ).not.toBeInTheDocument();

    openMenu();
    const push = await item("Push to PMSPA");
    await waitFor(() => expect(push).not.toHaveAttribute("aria-disabled"));
    fireEvent.click(push);

    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith(
        "/api/v1/integrations/pmspa/push/preview",
        expect.objectContaining({
          body: { type: "day", id: "2026-10-07" }
        })
      )
    );
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText("Push the logs of 7 Oct 2026 to PMSPA")
    ).toBeInTheDocument();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBe(dialog);
  });
});
