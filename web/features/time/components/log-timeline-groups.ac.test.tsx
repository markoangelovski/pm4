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

/** The axis tick labels under the bars, in order. */
const ticks = (panel: HTMLElement, pattern: RegExp) =>
  within(panel)
    .getAllByText(pattern)
    .map((el) => el.textContent);

/** The Timeline panel, once the day has loaded and its groups show. */
async function timelinePanel() {
  const panel = await screen.findByRole("tabpanel");
  await within(panel).findByRole("button", { name: /^Manhatan/ });
  return panel;
}

/** The group headings (the accordion triggers), in order. */
const headings = (panel: HTMLElement) =>
  Array.from(panel.querySelectorAll<HTMLElement>("[aria-expanded]"));

/** Collapsed groups' bars, and the number of log bars on each (the now line is aria-hidden). */
const collapsedBars = (panel: HTMLElement) =>
  within(panel)
    .queryAllByTestId("timeline-group-track")
    .map((t) => t.querySelectorAll("span:not([aria-hidden])").length);

const rowsIn = (panel: HTMLElement) => within(panel).queryAllByRole("listitem");

describe("Logs: Timeline grouped by project (feat-tlog-timeline-groups)", () => {
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

  it("AC-3 FR-TLOG-023 SCR-040: the By Project groups with log counts and sums, all collapsed, each with one bar of its logs", async () => {
    renderView();
    const panel = await timelinePanel();
    const hs = headings(panel);
    expect(hs).toHaveLength(3);
    const expected = [
      ["Manhatan", "2 logs", "2h 15m"],
      ["Unsorted", "1 log", "15m"],
      ["Non-prod", "1 log", "1h"]
    ];
    hs.forEach((h, i) => {
      const [name, count, sum] = expected[i];
      expect(h).toHaveTextContent(name);
      expect(within(h).getByText(count)).toBeInTheDocument();
      expect(within(h).getByText(sum)).toBeInTheDocument();
      expect(h).toHaveAttribute("aria-expanded", "false");
    });
    expect(rowsIn(panel)).toHaveLength(0);
    expect(collapsedBars(panel)).toEqual([2, 1, 1]);
    expect(
      screen.getByRole("button", { name: "Expand all" })
    ).toBeInTheDocument();
    expect(ticks(panel, /^\d\d:\d\d$/)).toEqual([
      "08:00",
      "09:00",
      "10:00",
      "11:00",
      "12:00"
    ]);
    expect(within(panel).getByText("Now 09:17")).toBeInTheDocument();
  });

  it("AC-4 FR-TLOG-023 SCR-040: opening a group shows its rows without the project name and drops its bar; closing it again", async () => {
    renderView();
    const panel = await timelinePanel();
    const manhatanHeading = within(panel).getByRole("button", {
      name: /^Manhatan/
    });
    fireEvent.click(manhatanHeading);
    await waitFor(() => expect(rowsIn(panel)).toHaveLength(2));
    expect(manhatanHeading).toHaveAttribute("aria-expanded", "true");
    const rows = rowsIn(panel);
    expect(within(rows[0]).getByText("08:00–08:30")).toBeInTheDocument();
    expect(within(rows[0]).getByText("30m")).toBeInTheDocument();
    expect(within(rows[1]).getByText("08:30–10:15")).toBeInTheDocument();
    expect(within(rows[1]).getByText("1h 45m")).toBeInTheDocument();
    expect(rows[0]).toHaveTextContent("Specifications 01");
    expect(rows[0]).not.toHaveTextContent("Manhatan");
    expect(collapsedBars(panel)).toEqual([1, 1]);
    expect(
      within(panel).getByRole("button", { name: /^Unsorted/ })
    ).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(manhatanHeading);
    await waitFor(() => expect(rowsIn(panel)).toHaveLength(0));
    expect(collapsedBars(panel)).toEqual([2, 1, 1]);
  });

  it("AC-5 FR-TLOG-003 FR-TLOG-023 SCR-040: Expand all opens every Timeline group; By Project keeps its own open groups", async () => {
    renderView();
    let panel = await timelinePanel();
    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
    await waitFor(() => expect(rowsIn(panel)).toHaveLength(4));
    expect(
      screen.getByRole("button", { name: "Collapse all" })
    ).toBeInTheDocument();
    expect(collapsedBars(panel)).toEqual([]);

    fireEvent.click(screen.getByRole("tab", { name: "By Project" }));
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "By Project" })).toHaveAttribute(
        "aria-selected",
        "true"
      )
    );
    panel = screen.getByRole("tabpanel");
    for (const h of headings(panel))
      expect(h).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.getByRole("button", { name: "Expand all" })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Timeline" }));
    panel = await timelinePanel();
    await waitFor(() => expect(rowsIn(panel)).toHaveLength(4));
  });

  it("AC-6 FR-TLOG-014 FR-TLOG-023 SCR-040: a deleted project's group shows its name with the deleted marker, before Unsorted", async () => {
    const gone = log({
      id: "l5",
      durationMinutes: 15,
      text: "Old fixes",
      project: ref(null, "Old site", true)
    });
    days["2026-10-07"] = dayOf("2026-10-07", 480, [...ownerLogs, gone]);
    renderView();
    const panel = await timelinePanel();
    const hs = headings(panel);
    expect(hs.map((h) => h.textContent)).toEqual([
      expect.stringMatching(/^Manhatan/),
      expect.stringMatching(/Old site/),
      expect.stringMatching(/^Unsorted/),
      expect.stringMatching(/^Non-prod/)
    ]);
    expect(
      within(hs[1]).getByRole("img", { name: "deleted" })
    ).toBeInTheDocument();
    fireEvent.click(hs[1]);
    await waitFor(() => expect(rowsIn(panel)).toHaveLength(1));
    expect(rowsIn(panel)[0]).toHaveTextContent("Old site");
    expect(rowsIn(panel)[0]).toHaveTextContent("Old fixes");
  });
});
