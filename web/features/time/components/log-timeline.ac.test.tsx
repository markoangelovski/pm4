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
import type { Day, Ref, TimeLog } from "../types";
import { DayView } from "./day-view";

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
  usePathname: () => "/app/time",
  useSearchParams: () => new URLSearchParams()
}));

vi.mock("next/link", () => ({
  default: ({ href, ...props }: { href: string } & ComponentProps<"a">) => (
    <a href={href} {...props} />
  )
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

const ref = (id: string | null, title: string, deleted = false): Ref => ({
  id,
  title,
  deleted
});
const manhatan = ref("p1", "Manhatan");

const log = (over: Partial<TimeLog> & { id: string }): TimeLog => ({
  workDate: "2026-10-07",
  durationMinutes: 60,
  text: "Work",
  title: null,
  project: null,
  task: null,
  excludeFromStats: false,
  ...over
});

/** The owner's logs (feat-tlog-web), in API order. */
const ownerLogs: TimeLog[] = [
  log({
    id: "l1",
    durationMinutes: 30,
    text: "Specs review",
    title: "Review",
    project: manhatan,
    task: ref("t1", "Specifications 01")
  }),
  log({
    id: "l2",
    durationMinutes: 105,
    text: "Specs audit",
    project: manhatan,
    task: ref("t2", "Specifications 02")
  }),
  log({ id: "l3", durationMinutes: 15, text: "Chat with coworker" }),
  log({
    id: "l4",
    durationMinutes: 60,
    text: "Commute",
    project: manhatan,
    excludeFromStats: true
  })
];

const dayOf = (
  workDate: string,
  startMinute: number | null,
  logs: TimeLog[]
): Day => ({
  workDate,
  startMinute,
  totalMinutes: logs.reduce((sum, l) => sum + l.durationMinutes, 0),
  logs: logs.map((l) => ({ ...l, workDate }))
});

const res = (status: number) => new Response(null, { status });

let days: Record<string, Day> = {};

type GetOptions = {
  params?: { path?: Record<string, string>; query?: Record<string, unknown> };
};

function routeGet() {
  api.GET.mockImplementation(async (path: string, options?: GetOptions) => {
    if (path === "/api/v1/me") return { data: me, response: res(200) };
    if (path === "/api/v1/workdays/{date}") {
      const date = options!.params!.path!.date;
      return {
        data: days[date] ?? dayOf(date, null, []),
        response: res(200)
      };
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
  return { onUrlUpdate, ...render(<DayView />, { wrapper }) };
}

const lastParam = (
  onUrlUpdate: ReturnType<typeof renderView>["onUrlUpdate"],
  name: string
) => onUrlUpdate.mock.calls.at(-1)?.[0].searchParams.get(name);

/** The Timeline panel's rows, once the day has loaded and its groups are open (feat-tlog-timeline-groups). */
async function timelineRows() {
  const panel = await screen.findByRole("tabpanel");
  fireEvent.click(await screen.findByRole("button", { name: "Expand all" }));
  const rows = await within(panel).findAllByRole("listitem");
  return { panel, rows };
}

/** The axis tick labels under the bars, in order. */
const ticks = (panel: HTMLElement, pattern: RegExp) =>
  within(panel)
    .getAllByText(pattern)
    .map((el) => el.textContent);

describe("Logs: Timeline view (feat-tlog-timeline)", () => {
  beforeAll(() => {
    // recharts' ResponsiveContainer needs it; jsdom has none.
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  beforeEach(() => {
    // "Now" is 2026-10-07 09:17 in Zagreb; only Date is faked, timers stay real.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-07T07:17:00.000Z"));
    Object.values(api).forEach((fn) => fn.mockReset());
    days = { "2026-10-07": dayOf("2026-10-07", 480, ownerLogs) };
    routeGet();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC-5 FR-TLOG-001 FR-TLOG-023 SCR-040: the tabs, Timeline first and the default, with Expand all (feat-tlog-timeline-groups); ?view=project selects By Project", async () => {
    const first = renderView();
    await screen.findByText("Wednesday, 7 October 2026");
    const timelineTab = await screen.findByRole("tab", { name: "Timeline" });
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual([
      "Timeline",
      "By Project",
      "By Task",
      "Sequential"
    ]);
    expect(timelineTab).toHaveAttribute("aria-selected", "true");
    expect(
      await screen.findByRole("button", { name: "Expand all" })
    ).toBeInTheDocument();
    first.unmount();

    renderView("?view=project");
    expect(
      await screen.findByRole("tab", { name: "By Project" })
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Timeline" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });

  it("AC-6 FR-TLOG-001 SCR-040: By Project sets view=project; Timeline clears it", async () => {
    const { onUrlUpdate } = renderView();
    fireEvent.click(await screen.findByRole("tab", { name: "By Project" }));
    await waitFor(() => expect(lastParam(onUrlUpdate, "view")).toBe("project"));
    fireEvent.click(screen.getByRole("tab", { name: "Timeline" }));
    await waitFor(() => expect(lastParam(onUrlUpdate, "view")).toBeNull());
  });

  it("AC-7 FR-TLOG-023 SCR-040: today's rows in API order with clock ranges and durations, the Non-prod badge, the ticks and Now", async () => {
    renderView();
    const { panel, rows } = await timelineRows();
    expect(rows).toHaveLength(4);
    const expected = [
      ["Specs review", "08:00–08:30", "30m"],
      ["Specs audit", "08:30–10:15", "1h 45m"],
      ["Chat with coworker", "10:15–10:30", "15m"],
      ["Commute", "10:30–11:30", "1h"]
    ];
    rows.forEach((row, i) => {
      const [text, range, duration] = expected[i];
      expect(row).toHaveTextContent(text);
      expect(within(row).getByText(range)).toBeInTheDocument();
      expect(within(row).getByText(duration)).toBeInTheDocument();
    });
    expect(rows[0]).toHaveTextContent("Specifications 01");
    expect(rows[0]).not.toHaveTextContent("Manhatan");
    expect(within(rows[0]).getByText(/^Review\s*$/)).toBeInTheDocument();
    expect(
      rows.filter((r) => within(r).queryByText("Non-prod") !== null)
    ).toHaveLength(1);
    expect(within(rows[3]).getByText("Non-prod")).toBeInTheDocument();
    expect(ticks(panel, /^\d\d:\d\d$/)).toEqual([
      "08:00",
      "09:00",
      "10:00",
      "11:00",
      "12:00"
    ]);
    expect(within(panel).getByText("Now 09:17")).toBeInTheDocument();
  });

  it("AC-8 FR-TLOG-023 SCR-040: a past date has no Now under the axis", async () => {
    days["2026-10-06"] = dayOf("2026-10-06", 480, ownerLogs);
    renderView("?date=2026-10-06");
    await screen.findByText("Tuesday, 6 October 2026");
    const { panel, rows } = await timelineRows();
    expect(rows).toHaveLength(4);
    expect(within(rows[0]).getByText("08:00–08:30")).toBeInTheDocument();
    expect(within(panel).queryByText(/^Now /)).not.toBeInTheDocument();
  });

  it("AC-9 FR-TLOG-023 SCR-040: a day without a start has elapsed ranges and ticks, and no Now", async () => {
    days["2026-10-06"] = dayOf("2026-10-06", null, [
      log({ id: "e1", durationMinutes: 30, text: "Planning" }),
      log({ id: "e2", durationMinutes: 105, text: "Specs audit" })
    ]);
    renderView("?date=2026-10-06");
    await screen.findByText("Tuesday, 6 October 2026");
    const { panel, rows } = await timelineRows();
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("0h–30m")).toBeInTheDocument();
    expect(within(rows[1]).getByText("30m–2h 15m")).toBeInTheDocument();
    expect(ticks(panel, /^\d+h$/)).toEqual(["0h", "1h", "2h", "3h"]);
    expect(within(panel).queryByText(/^Now /)).not.toBeInTheDocument();
  });

  it("AC-10 FR-TLOG-014 FR-TLOG-023 SCR-040: a deleted project and task show with the deleted marker; rows have no actions", async () => {
    const gone = log({
      id: "l5",
      durationMinutes: 15,
      text: "Old fixes",
      project: ref(null, "Old site", true),
      task: ref(null, "Old task", true)
    });
    days["2026-10-07"] = dayOf("2026-10-07", 480, [...ownerLogs, gone]);
    renderView();
    const { panel, rows } = await timelineRows();
    expect(rows).toHaveLength(5);
    const row = rows.find((r) => r.textContent?.includes("Old fixes"))!;
    expect(row).toHaveTextContent("Old fixes");
    expect(row).toHaveTextContent("Old site");
    expect(row).toHaveTextContent("Old task");
    expect(within(row).getAllByRole("img", { name: "deleted" })).toHaveLength(
      2
    );
    expect(
      within(panel).queryAllByRole("button", { name: "Log actions" })
    ).toHaveLength(0);
  });
});
