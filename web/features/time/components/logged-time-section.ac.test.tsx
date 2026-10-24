import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps, ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { createQueryClient } from "@/lib/query-client";
import type { TimeLogList } from "@/features/time/api";
import { LoggedTimeSection } from "./logged-time-section";

const api = vi.hoisted(() => ({ GET: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => nav,
  usePathname: () => "/app/project",
  useSearchParams: () => new URLSearchParams()
}));

// A plain anchor keeps the exact href (next.config isn't loaded in Vitest).
vi.mock("next/link", () => ({
  default: ({ href, ...props }: { href: string } & ComponentProps<"a">) => (
    <a href={href} {...props} />
  )
}));

type Item = TimeLogList["items"][number];

const project = { id: "p1", title: "Anthropic", deleted: false };
const meetings = { id: "t1", title: "Meetings", deleted: false };
const qa = { id: "t2", title: "QA", deleted: false };

const item = (over: Partial<Item>): Item => ({
  id: "l1",
  workDate: "2026-10-06",
  durationMinutes: 60,
  text: "Kick-off call",
  title: null,
  project,
  task: null,
  excludeFromStats: false,
  bookings: [],
  ...over
});

/** Project P: 30 min on T1 (unbooked), 60 min direct (booked), 15 min on T2 (excluded). */
const projectLogs: TimeLogList = {
  items: [
    item({
      id: "l2",
      workDate: "2026-10-07",
      durationMinutes: 30,
      text: "Weekly sync",
      task: meetings
    }),
    item({ id: "l1", bookings: [{ date: "2026-10-07", minutes: 60 }] }),
    item({
      id: "l3",
      durationMinutes: 15,
      text: "Regression pass",
      task: qa,
      excludeFromStats: true
    })
  ],
  page: 1,
  pageSize: 25,
  total: 3,
  totalMinutes: 105,
  bookedMinutes: 60,
  days: [
    { workDate: "2026-10-06", workedMinutes: 75, bookedMinutes: 60 },
    { workDate: "2026-10-07", workedMinutes: 30, bookedMinutes: 0 }
  ]
};

const res = (status: number) => new Response(null, { status });

/** GET router: /time-logs → `listResult` (a function of the query). */
let listResult: (query: Record<string, unknown>) => unknown;
function routeGet() {
  api.GET.mockImplementation(
    async (
      path: string,
      init?: { params?: { query?: Record<string, unknown> } }
    ) => {
      if (path === "/api/v1/time-logs")
        return listResult(init?.params?.query ?? {});
      throw new Error(`unexpected GET ${path}`);
    }
  );
}
const listQueries = () =>
  api.GET.mock.calls
    .filter(([path]) => path === "/api/v1/time-logs")
    .map(
      ([, init]) =>
        (init as { params: { query: Record<string, unknown> } }).params.query
    );

function renderSection(
  props: ComponentProps<typeof LoggedTimeSection>,
  search = ""
) {
  const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
  const queryClient = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <NuqsTestingAdapter
      searchParams={search}
      hasMemory
      onUrlUpdate={onUrlUpdate}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </NuqsTestingAdapter>
  );
  return {
    onUrlUpdate,
    ...render(<LoggedTimeSection {...props} />, { wrapper })
  };
}

const headers = () =>
  screen.getAllByRole("columnheader").map((h) => h.textContent);

/** A totals figure: its label, then its value (e.g. "Total worked" · "1h 45m"). */
const figure = (label: string, value: string) =>
  screen.getByText(wholeText(`${label}${value}`));

/** Switches the section to its Table tab (the Chart tab is shown at first). */
const showTable = () =>
  fireEvent.click(screen.getByRole("tab", { name: "Table" }));

/** An element whose whole text is `text` (a booking line spans nested elements). */
const wholeText = (text: string) => (_: string, el: Element | null) =>
  el?.textContent === text &&
  Array.from(el.children).every((child) => child.textContent !== text);

describe("LoggedTimeSection (feat-proto-sync-web, feat-book-partial, feat-proto-sync-logged-chart)", () => {
  beforeAll(() => {
    // recharts' ResponsiveContainer needs it; jsdom has none.
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  beforeEach(() => {
    api.GET.mockReset();
    routeGet();
  });

  it("AC-11 FR-TLOG-012 SCR-044: a project's section shows the totals, the columns, links to the day and the task, and the booking date or -", async () => {
    listResult = () => ({ data: projectLogs, response: res(200) });

    renderSection({ projectId: "p1" });
    showTable();

    expect(await screen.findByText("Weekly sync")).toBeInTheDocument();
    expect(figure("Total worked", "1h 45m")).toBeInTheDocument();
    expect(figure("Booked", "1h")).toBeInTheDocument();
    expect(headers()).toEqual([
      "Date worked",
      "Log",
      "Task",
      "Booked date",
      "Duration"
    ]);
    expect(listQueries()[0]).toEqual({
      projectId: "p1",
      page: 1,
      pageSize: 25
    });

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(3);

    const unbooked = within(rows[0]);
    expect(unbooked.getByRole("link", { name: "7 Oct 2026" })).toHaveAttribute(
      "href",
      "/app/time?date=2026-10-07"
    );
    expect(unbooked.getByRole("link", { name: "Meetings" })).toHaveAttribute(
      "href",
      "/app/task?id=t1"
    );
    expect(unbooked.getByText("30m")).toBeInTheDocument();
    expect(unbooked.getByText("-")).toBeInTheDocument();

    const booked = within(rows[1]);
    expect(booked.getByRole("link", { name: "6 Oct 2026" })).toHaveAttribute(
      "href",
      "/app/time?date=2026-10-06"
    );
    expect(booked.getByText("Kick-off call")).toBeInTheDocument();
    expect(booked.getByText("7 Oct 2026")).toBeInTheDocument();
    expect(booked.getByText("1h")).toBeInTheDocument();
    expect(booked.queryByRole("link", { name: "Meetings" })).toBeNull();
  });

  it("AC-20 FR-TLOG-012 SCR-044 OQ-214: Booked date lists each booking with its minutes, then the unbooked part; - without bookings; Booked is bookedMinutes", async () => {
    listResult = () => ({
      data: {
        items: [
          item({
            id: "f",
            workDate: "2026-10-07",
            durationMinutes: 135,
            text: "Planning",
            task: meetings,
            bookings: [
              { date: "2026-10-06", minutes: 30 },
              { date: "2026-10-07", minutes: 45 }
            ]
          }),
          item({
            id: "e",
            workDate: "2026-10-07",
            durationMinutes: 240,
            text: "Development",
            bookings: [{ date: "2026-10-07", minutes: 240 }]
          }),
          item({ id: "b", text: "Internal sync" })
        ],
        page: 1,
        pageSize: 25,
        total: 3,
        totalMinutes: 435,
        bookedMinutes: 315,
        days: [
          { workDate: "2026-10-06", workedMinutes: 60, bookedMinutes: 0 },
          { workDate: "2026-10-07", workedMinutes: 375, bookedMinutes: 315 }
        ]
      },
      response: res(200)
    });

    renderSection({ projectId: "p1" });
    showTable();

    expect(await screen.findByText("Planning")).toBeInTheDocument();
    expect(figure("Booked", "5h 15m")).toBeInTheDocument();
    const [f, e, b] = screen
      .getAllByRole("row")
      .slice(1)
      .map((r) => within(r));
    expect(f.getByText(wholeText("6 Oct 2026 · 30m"))).toBeInTheDocument();
    expect(f.getByText(wholeText("7 Oct 2026 · 45m"))).toBeInTheDocument();
    expect(f.getByText("1h unbooked")).toBeInTheDocument();
    expect(e.getByText(wholeText("7 Oct 2026 · 4h"))).toBeInTheDocument();
    expect(e.queryByText(/unbooked/)).toBeNull();
    expect(b.getByText("-")).toBeInTheDocument();
  });

  it("AC-12 FR-TLOG-012 SCR-044: a task's section has no Task column, pages through logsPage, and shows the empty and error states", async () => {
    const many = Array.from({ length: 25 }, (_, i) =>
      item({ id: `l${i}`, text: `Log ${i}`, task: meetings })
    );
    listResult = (query) => ({
      data: {
        items: query.page === 2 ? many.slice(0, 5) : many,
        page: query.page,
        pageSize: 25,
        total: 30,
        totalMinutes: 1800,
        bookedMinutes: 0,
        days: [
          { workDate: "2026-10-06", workedMinutes: 1800, bookedMinutes: 0 }
        ]
      },
      response: res(200)
    });

    const { onUrlUpdate, unmount } = renderSection({ taskId: "t1" });
    showTable();

    expect(await screen.findByText("Log 0")).toBeInTheDocument();
    expect(headers()).toEqual([
      "Date worked",
      "Log",
      "Booked date",
      "Duration"
    ]);
    expect(listQueries()[0]).toEqual({ taskId: "t1", page: 1, pageSize: 25 });
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Page 2 of 2")).toBeInTheDocument();
    const url = onUrlUpdate.mock.calls.at(-1)![0].searchParams;
    expect(url.get("logsPage")).toBe("2");
    expect(listQueries().at(-1)).toEqual({
      taskId: "t1",
      page: 2,
      pageSize: 25
    });
    unmount();

    // No logs.
    listResult = () => ({
      data: {
        items: [],
        page: 1,
        pageSize: 25,
        total: 0,
        totalMinutes: 0,
        bookedMinutes: 0,
        days: []
      },
      response: res(200)
    });
    const empty = renderSection({ taskId: "t1" });
    expect(await screen.findByText("No time logged yet.")).toBeInTheDocument();
    empty.unmount();

    // A failed request, then Retry.
    listResult = () => ({ error: "Internal Server Error", response: res(500) });
    renderSection({ taskId: "t1" });
    showTable();
    expect(
      await screen.findByText("Couldn't load the logs.", undefined, {
        timeout: 4000
      })
    ).toBeInTheDocument();
    const before = listQueries().length;
    listResult = () => ({ data: projectLogs, response: res(200) });
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Weekly sync")).toBeInTheDocument();
    expect(listQueries().length).toBeGreaterThan(before);
  });

  describe("Chart (feat-proto-sync-logged-chart)", () => {
    it("AC-5 FR-TLOG-012 SCR-044: Chart is selected at first with the totals, the legend by day and the hint; Table shows the table", async () => {
      listResult = () => ({ data: projectLogs, response: res(200) });

      renderSection({ projectId: "p1" });

      expect(
        await screen.findByText("57% booked · 45m still to book")
      ).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Chart" })).toHaveAttribute(
        "aria-selected",
        "true"
      );
      expect(screen.queryByRole("table")).toBeNull();
      expect(screen.queryByText("Weekly sync")).toBeNull();
      expect(figure("Total worked", "1h 45m")).toBeInTheDocument();
      expect(figure("Booked", "1h")).toBeInTheDocument();
      expect(figure("Not booked", "45m")).toBeInTheDocument();
      expect(screen.getByText("· by day")).toBeInTheDocument();
      expect(
        screen.getByText("Click a bar to open that day in Logs.")
      ).toBeInTheDocument();

      showTable();
      expect(screen.getByRole("tab", { name: "Table" })).toHaveAttribute(
        "aria-selected",
        "true"
      );
      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.getByText("Weekly sync")).toBeInTheDocument();
    });

    it("AC-5 FR-TLOG-012 SCR-044: all booked → Everything is booked; no logs → No time logged yet. and no totals", async () => {
      listResult = () => ({
        data: {
          items: [item({ bookings: [{ date: "2026-10-07", minutes: 60 }] })],
          page: 1,
          pageSize: 25,
          total: 1,
          totalMinutes: 60,
          bookedMinutes: 60,
          days: [
            { workDate: "2026-10-06", workedMinutes: 60, bookedMinutes: 60 }
          ]
        },
        response: res(200)
      });
      const booked = renderSection({ projectId: "p1" });
      expect(
        await screen.findByText("Everything is booked")
      ).toBeInTheDocument();
      expect(screen.queryByText(/still to book/)).toBeNull();
      booked.unmount();

      listResult = () => ({
        data: {
          items: [],
          page: 1,
          pageSize: 25,
          total: 0,
          totalMinutes: 0,
          bookedMinutes: 0,
          days: []
        },
        response: res(200)
      });
      renderSection({ projectId: "p1" });
      expect(
        await screen.findByText("No time logged yet.")
      ).toBeInTheDocument();
      expect(screen.queryByText("Total worked")).toBeNull();
      expect(screen.queryByText("Everything is booked")).toBeNull();
    });

    it("AC-5 FR-TLOG-012 SCR-044: days spanning 1 Oct – 15 Dec 2026 → the chart goes by week, without the hint", async () => {
      listResult = () => ({
        data: {
          items: [
            item({ id: "a", workDate: "2026-12-15" }),
            item({ id: "b", workDate: "2026-10-01" })
          ],
          page: 1,
          pageSize: 25,
          total: 2,
          totalMinutes: 120,
          bookedMinutes: 0,
          days: [
            { workDate: "2026-10-01", workedMinutes: 60, bookedMinutes: 0 },
            { workDate: "2026-12-15", workedMinutes: 60, bookedMinutes: 0 }
          ]
        },
        response: res(200)
      });

      renderSection({ projectId: "p1" });

      expect(await screen.findByText("· by week")).toBeInTheDocument();
      expect(screen.queryByText("· by day")).toBeNull();
      expect(
        screen.queryByText("Click a bar to open that day in Logs.")
      ).toBeNull();
    });
  });
});
