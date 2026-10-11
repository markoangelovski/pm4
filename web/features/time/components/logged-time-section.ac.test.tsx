import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps, ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { createQueryClient } from "@/lib/query-client";
import type { TimeLogList } from "@/features/time/api";
import { LoggedTimeSection } from "./logged-time-section";

const api = vi.hoisted(() => ({ GET: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

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
  bookingDate: null,
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
    item({ id: "l1", bookingDate: "2026-10-07" }),
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
  bookedMinutes: 60
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

describe("LoggedTimeSection (feat-proto-sync-web)", () => {
  beforeEach(() => {
    api.GET.mockReset();
    routeGet();
  });

  it("AC-11 FR-TLOG-012 SCR-044: a project's section shows the totals, the columns, links to the day and the task, and the booking date or -", async () => {
    listResult = () => ({ data: projectLogs, response: res(200) });

    renderSection({ projectId: "p1" });

    expect(await screen.findByText("Weekly sync")).toBeInTheDocument();
    expect(screen.getByText(/Total worked: 1h 45m/)).toBeInTheDocument();
    expect(screen.getByText(/Booked: 1h$/)).toBeInTheDocument();
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
        bookedMinutes: 0
      },
      response: res(200)
    });

    const { onUrlUpdate, unmount } = renderSection({ taskId: "t1" });

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
        bookedMinutes: 0
      },
      response: res(200)
    });
    const empty = renderSection({ taskId: "t1" });
    expect(await screen.findByText("No time logged yet.")).toBeInTheDocument();
    empty.unmount();

    // A failed request, then Retry.
    listResult = () => ({ error: "Internal Server Error", response: res(500) });
    renderSection({ taskId: "t1" });
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
});
