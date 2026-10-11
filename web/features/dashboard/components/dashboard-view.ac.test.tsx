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
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { createQueryClient } from "@/lib/query-client";
import type { Me } from "@/features/users/api";
import type { DashboardReport } from "../stats";
import { DashboardView } from "./dashboard-view";

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PUT: vi.fn(),
  PATCH: vi.fn(),
  DELETE: vi.fn()
}));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => nav,
  usePathname: () => "/app",
  useSearchParams: () => new URLSearchParams()
}));

// A plain anchor keeps the exact href (next.config isn't loaded in Vitest).
vi.mock("next/link", () => ({
  default: ({ href, ...props }: { href: string } & ComponentProps<"a">) => (
    <a href={href} {...props} />
  )
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

/** The report for 1–31 Oct 2026 (spec, Acceptance criteria). */
const ownerReport: DashboardReport = {
  days: [
    {
      workDate: "2026-10-01",
      startMinute: 480,
      workedMinutes: 0,
      bookedMinutes: 0
    },
    {
      workDate: "2026-10-06",
      startMinute: 510,
      workedMinutes: 315,
      bookedMinutes: 120
    },
    {
      workDate: "2026-10-07",
      startMinute: 555,
      workedMinutes: 375,
      bookedMinutes: 240
    }
  ],
  projects: [
    {
      kind: "project",
      project: { id: "p-anthropic", title: "Anthropic", deleted: false },
      workedMinutes: 255,
      bookedMinutes: 120
    },
    {
      kind: "project",
      project: { id: "p-nvidia", title: "Nvidia", deleted: false },
      workedMinutes: 240,
      bookedMinutes: 240
    },
    {
      kind: "project",
      project: { id: null, title: "PM Internal", deleted: true },
      workedMinutes: 60,
      bookedMinutes: 0
    },
    { kind: "unsorted", project: null, workedMinutes: 45, bookedMinutes: 0 },
    { kind: "nonprod", project: null, workedMinutes: 90, bookedMinutes: 0 }
  ]
};

const taskTotals: Record<string, number> = {
  upcoming: 2,
  "in-progress": 3,
  completed: 4
};

const res = (status: number) => new Response(null, { status });
const fail = () => ({ error: "Internal Server Error", response: res(500) });
const page = (total: number) => ({
  data: { items: [], total, page: 1, pageSize: 1 },
  response: res(200)
});

/** What the API returns; set per test. */
let report: DashboardReport = ownerReport;
let reportState: "ok" | "pending" | "fail" = "ok";
let projectsFail = false;

type GetOptions = { params?: { query?: Record<string, unknown> } };

function routeApi() {
  api.GET.mockImplementation(async (path: string, options?: GetOptions) => {
    const query = options?.params?.query ?? {};
    if (path === "/api/v1/me") return { data: me, response: res(200) };
    if (path === "/api/v1/reports/dashboard") {
      if (reportState === "pending") return new Promise(() => {});
      if (reportState === "fail") return fail();
      return { data: report, response: res(200) };
    }
    if (path === "/api/v1/projects") return projectsFail ? fail() : page(12);
    if (path === "/api/v1/tasks") {
      const status = Array.isArray(query.status)
        ? query.status[0]
        : query.status;
      return page(taskTotals[status as string]);
    }
    throw new Error(`unexpected GET ${path}`);
  });
}

function renderView(search = "") {
  const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
  const queryClient = createQueryClient();
  queryClient.setQueryData(["users", "me"], me);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <NuqsTestingAdapter
      searchParams={search}
      hasMemory
      onUrlUpdate={onUrlUpdate}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </NuqsTestingAdapter>
  );
  return { onUrlUpdate, ...render(<DashboardView />, { wrapper }) };
}

const lastParam = (
  onUrlUpdate: ReturnType<typeof renderView>["onUrlUpdate"],
  name: string
) => onUrlUpdate.mock.calls.at(-1)?.[0].searchParams.get(name);

/** The ranges GET /reports/dashboard was asked for, as "from..to". */
const requestedRanges = () =>
  api.GET.mock.calls
    .filter(([path]) => path === "/api/v1/reports/dashboard")
    .map(([, options]) => {
      const query = (options as GetOptions).params?.query ?? {};
      return `${String(query.from)}..${String(query.to)}`;
    });

const loaded = () => screen.findByText("Sum of all logs");

/** The nearest element around `text` whose content also includes `alsoHas` (a tile, a card, a row). */
function around(
  text: string | RegExp,
  alsoHas: string,
  container: HTMLElement = document.body
): HTMLElement {
  let el: HTMLElement | null = within(container).getByText(text);
  while (el && !el.textContent?.includes(alsoHas)) el = el.parentElement;
  return el!;
}

const projectsTile = () =>
  document.querySelector('a[href="/app/projects"]') as HTMLElement;
const tasksTile = () =>
  document.querySelector('a[href="/app/tasks"]') as HTMLElement;
const workdaysTile = () => around(/Days with a start time/, "Workdays");
const avgStartTile = () => around(/^Earliest/, "Average start");
const summaryCard = () => around("Sum of all logs", "Booked of worked");
const runningCard = () => around("Running totals", "Booked");
const projectsCard = () => around("Hours by project", "Non-prod");

function pick(option: HTMLElement) {
  fireEvent.pointerDown(option);
  fireEvent.mouseDown(option);
  fireEvent.pointerUp(option);
  fireEvent.mouseUp(option);
  fireEvent.click(option);
}

/** Opens the Time range select and picks an entry. */
async function chooseRange(label: string) {
  fireEvent.click(screen.getByLabelText("Time range"));
  pick(await screen.findByRole("option", { name: label }));
}

/** A day cell of the open calendar (not an outside day of the other month). */
const dayCell = (iso: string) =>
  document.querySelector(
    `[role="gridcell"][data-day="${iso}"]:not([data-outside])`
  ) as HTMLElement | null;
const clickDay = (iso: string) => {
  const cell = dayCell(iso)!;
  fireEvent.click(cell.querySelector("button") ?? cell);
};

describe("DashboardView (feat-rpt-web)", () => {
  beforeAll(() => {
    // recharts' ResponsiveContainer needs it; jsdom has none.
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  beforeEach(() => {
    // "Now" is 2026-10-09 12:00 in Zagreb; only Date is faked, timers stay real.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-09T10:00:00.000Z"));
    Object.values(api).forEach((fn) => fn.mockReset());
    nav.push.mockReset();
    report = ownerReport;
    reportState = "ok";
    projectsFail = false;
    routeApi();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC-7 FR-RPT-001 FR-RPT-002 SCR-010: heading, this month by default, the four tiles", async () => {
    renderView();
    await loaded();
    expect(
      screen.getByRole("heading", { name: "Dashboard" })
    ).toBeInTheDocument();
    expect(screen.getByText("October 2026")).toBeInTheDocument();
    expect(screen.getByLabelText("Time range")).toHaveTextContent("This month");
    expect(requestedRanges()).toEqual(["2026-10-01..2026-10-31"]);

    await waitFor(() => expect(projectsTile()).toHaveTextContent("12"));
    expect(projectsTile()).toHaveTextContent("Projects");
    expect(projectsTile()).toHaveTextContent(
      "3 with time logged in this range"
    );

    await waitFor(() => expect(tasksTile()).toHaveTextContent(/Tasks\s*9/));
    expect(tasksTile()).toHaveTextContent(/Upcoming\s*2/);
    expect(tasksTile()).toHaveTextContent(/In progress\s*3/);
    expect(tasksTile()).toHaveTextContent(/Completed\s*4/);

    expect(workdaysTile()).toHaveTextContent(/Workdays\s*3/);
    expect(workdaysTile()).toHaveTextContent(
      "Days with a start time, of 7 weekdays so far"
    );
    expect(avgStartTile()).toHaveTextContent(/Average start\s*08:35/);
    expect(avgStartTile()).toHaveTextContent("Earliest 08:00 · latest 09:15");
  });

  it("AC-8 FR-RPT-001 OQ-130 SCR-010: presets and a picked range in the URL, this month clears it, a too-long URL range falls back", async () => {
    const view = renderView();
    await loaded();

    await chooseRange("Last 7 days");
    await waitFor(() =>
      expect(lastParam(view.onUrlUpdate, "from")).toBe("2026-10-03")
    );
    expect(lastParam(view.onUrlUpdate, "to")).toBe("2026-10-09");
    await waitFor(() =>
      expect(requestedRanges()).toContain("2026-10-03..2026-10-09")
    );
    expect(
      await screen.findByText("3 Oct 2026 – 9 Oct 2026")
    ).toBeInTheDocument();

    await chooseRange("This month");
    await waitFor(() => expect(lastParam(view.onUrlUpdate, "from")).toBeNull());
    expect(lastParam(view.onUrlUpdate, "to")).toBeNull();
    view.unmount();

    // Over 366 days in the URL → this month.
    api.GET.mockClear();
    const tooLong = renderView("?from=2025-01-01&to=2026-10-09");
    await loaded();
    expect(requestedRanges()).toEqual(["2026-10-01..2026-10-31"]);
    expect(screen.getByText("October 2026")).toBeInTheDocument();
    tooLong.unmount();

    // Pick dates: 1 Sep and 9 Oct, then Apply.
    const picked = renderView();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Pick dates" }));
    await waitFor(() => expect(dayCell("2026-10-09")).toBeTruthy());
    if (!dayCell("2026-09-01")) {
      fireEvent.click(
        screen.getByRole("button", { name: "Go to the Previous Month" })
      );
      await waitFor(() => expect(dayCell("2026-09-01")).toBeTruthy());
    }
    clickDay("2026-09-01");
    clickDay("2026-10-09");
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() =>
      expect(lastParam(picked.onUrlUpdate, "from")).toBe("2026-09-01")
    );
    expect(lastParam(picked.onUrlUpdate, "to")).toBe("2026-10-09");
    await waitFor(() =>
      expect(requestedRanges()).toContain("2026-09-01..2026-10-09")
    );
    expect(
      await screen.findByText("1 Sep 2026 – 9 Oct 2026")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Time range")).toHaveTextContent(
      "Custom range"
    );
  });

  it("AC-9 FR-RPT-004 FR-RPT-005 SCR-010: worked, target and booked; the running totals' legend", async () => {
    renderView();
    await loaded();
    const summary = summaryCard();
    expect(summary).toHaveTextContent("11h 30m");
    expect(summary).toHaveTextContent("21h");
    expect(summary).toHaveTextContent("3 days × 7h");
    expect(summary).toHaveTextContent("6h");
    expect(summary).toHaveTextContent("9h 30m under target");
    expect(summary).toHaveTextContent(/Worked of target\s*54\s?%/);
    expect(summary).toHaveTextContent(/Booked of worked\s*52\s?%/);
    expect(summary).toHaveTextContent("5h 30m still to book");

    const running = runningCard();
    expect(running).toHaveTextContent(/Worked\s*11h 30m/);
    expect(running).toHaveTextContent(/Target\s*21h/);
    expect(running).toHaveTextContent(/Booked\s*6h/);
  });

  it("AC-10 FR-RPT-006 SCR-010: hours by project in API order, links, deleted and the two buckets; nothing logged", async () => {
    const first = renderView();
    await loaded();
    const card = projectsCard();
    const text = card.textContent ?? "";
    const order = [
      "Anthropic",
      "Nvidia",
      "PM Internal",
      "Unsorted",
      "Non-prod"
    ];
    const positions = order.map((name) => text.indexOf(name));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);

    const anthropic = within(card).getByRole("link", { name: /Anthropic/ });
    expect(anthropic).toHaveAttribute("href", "/app/project?id=p-anthropic");
    const anthropicRow = around(/^Anthropic$/, "booked", card);
    expect(anthropicRow).toHaveTextContent("4h 15m");
    expect(anthropicRow).toHaveTextContent("2h booked");

    expect(
      within(card).queryByRole("link", { name: /PM Internal/ })
    ).not.toBeInTheDocument();
    expect(around(/PM Internal/, "(deleted)", card)).toBeTruthy();

    expect(within(card).queryByRole("link", { name: /Unsorted/ })).toBeNull();
    expect(within(card).queryByRole("link", { name: /Non-prod/ })).toBeNull();
    const unsorted = around("Unsorted", "45m", card);
    expect(unsorted).toHaveTextContent("—");
    expect(unsorted).not.toHaveTextContent("booked");
    const nonprod = around("Non-prod", "1h 30m", card);
    expect(nonprod).toHaveTextContent("—");
    expect(nonprod).not.toHaveTextContent("booked");
    first.unmount();

    report = { ...ownerReport, projects: [] };
    renderView();
    expect(
      await screen.findByText("Nothing logged in this range.")
    ).toBeInTheDocument();
  });

  it("AC-11 FR-RPT-003 SCR-010: the Workdays card by day and its table", async () => {
    renderView();
    await loaded();
    expect(screen.getByText(/by day/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Table" }));
    const sixth = (await screen.findByText("Tue, 6 Oct 2026")).closest(
      "tr"
    ) as HTMLElement;
    const table = sixth.closest("table") as HTMLElement;
    const bodyRows = within(table)
      .getAllByRole("row")
      .filter((row) => within(row).queryAllByRole("cell").length > 0);
    expect(bodyRows).toHaveLength(22);
    expect(
      within(sixth)
        .getAllByRole("cell")
        .map((c) => c.textContent?.trim())
    ).toEqual(["Tue, 6 Oct 2026", "08:30", "5h 15m", "2h", "7h"]);
  });

  it("AC-12 SCR-010: report pending → skeletons; report error → Retry; a failed project count → —", async () => {
    reportState = "pending";
    const pending = renderView();
    await waitFor(() =>
      expect(requestedRanges()).toEqual(["2026-10-01..2026-10-31"])
    );
    expect(
      document.querySelectorAll('[data-slot="skeleton"]').length
    ).toBeGreaterThan(0);
    expect(screen.queryByText("Sum of all logs")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Table" })).toBeNull();
    expect(screen.queryByText("Nothing logged in this range.")).toBeNull();
    pending.unmount();

    reportState = "fail";
    api.GET.mockClear();
    const failed = renderView();
    expect(
      await screen.findByText(
        "Couldn't load the dashboard.",
        {},
        { timeout: 4000 }
      )
    ).toBeInTheDocument();
    expect(screen.queryByText("Sum of all logs")).toBeNull();
    const before = requestedRanges().length;
    reportState = "ok";
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await loaded();
    expect(requestedRanges().length).toBeGreaterThan(before);
    failed.unmount();

    projectsFail = true;
    renderView();
    await loaded();
    await waitFor(() => expect(projectsTile()).toHaveTextContent("—"), {
      timeout: 4000
    });
    expect(projectsTile()).not.toHaveTextContent("12");
    expect(tasksTile()).toHaveTextContent(/Tasks\s*9/);
    expect(workdaysTile()).toHaveTextContent(/Workdays\s*3/);
  });
});
