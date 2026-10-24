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

/** The owner's logs (spec, Acceptance criteria), in API order. */
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

/** The day each date returns; set per test. A missing date has no start and no logs. */
let days: Record<string, Day> = {};
let dayFails = false;
const workdayItems = [
  { workDate: "2026-10-05", startMinute: 540, totalMinutes: 300 },
  { workDate: "2026-10-06", startMinute: 480, totalMinutes: 0 }
];

type GetOptions = {
  params?: { path?: Record<string, string>; query?: Record<string, unknown> };
};

function routeGet() {
  api.GET.mockImplementation(async (path: string, options?: GetOptions) => {
    if (path === "/api/v1/me") return { data: me, response: res(200) };
    if (path === "/api/v1/workdays/{date}") {
      if (dayFails) {
        return { error: "Internal Server Error", response: res(500) };
      }
      const date = options!.params!.path!.date;
      return {
        data: days[date] ?? dayOf(date, null, []),
        response: res(200)
      };
    }
    if (path === "/api/v1/workdays") {
      return { data: { items: workdayItems }, response: res(200) };
    }
    if (path === "/api/v1/projects") {
      return {
        data: { items: [], total: 0, page: 1, pageSize: 100 },
        response: res(200)
      };
    }
    if (path === "/api/v1/tasks") {
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

/** The card that holds a header label. */
const card = (label: string) =>
  screen.getByText(label).closest('[data-slot="card"]') as HTMLElement;

/** A group's accordion trigger. */
const group = (name: RegExp) => screen.getByRole("button", { name });

/** The row that holds a log text (the nearest ancestor with the row's ⋯ menu). */
function rowOf(text: string, container: HTMLElement = document.body) {
  let el: HTMLElement | null = within(container).getByText(text);
  while (el && !within(el).queryByRole("button", { name: "Log actions" })) {
    el = el.parentElement;
  }
  return el!;
}

function pick(option: HTMLElement) {
  fireEvent.pointerDown(option);
  fireEvent.mouseDown(option);
  fireEvent.pointerUp(option);
  fireEvent.mouseUp(option);
  fireEvent.click(option);
}

/** A day cell of the open calendar. */
const dayCell = (iso: string) =>
  document.querySelector(`[role="gridcell"][data-day="${iso}"]`) as HTMLElement;

const loaded = () => screen.findByText("Wednesday, 7 October 2026");

describe("DayView (feat-tlog-web, feat-proto-sync-logged-chart)", () => {
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
    dayFails = false;
    routeGet();
    toast.success.mockReset();
    toast.error.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC-15 FR-TLOG-009 SCR-040: the header figures for today (Billable (%) is AC-6 of feat-proto-sync-logged-chart), Unlogged when behind, no Now on a past date, the date in full", async () => {
    const first = renderView();
    await loaded();
    expect(screen.getByRole("heading", { name: "Logs" })).toBeInTheDocument();
    await waitFor(() => expect(card("Start")).toHaveTextContent("08:00"));
    expect(card("Logged")).toHaveTextContent("3h 30m");
    expect(card("Start + logged")).toHaveTextContent("11:30");
    expect(card("Billable (%)")).toHaveTextContent("2h 30m (36%)");
    expect(screen.queryByText("% billable")).not.toBeInTheDocument();
    expect(card("Overtime")).toHaveTextContent("0h");
    expect(card("Now")).toHaveTextContent("09:17");
    // 08:00 + 3h 30m is after 09:17 → nothing unlogged.
    expect(screen.queryByText("Unlogged")).not.toBeInTheDocument();
    first.unmount();

    days["2026-10-07"] = dayOf("2026-10-07", 480, [
      log({ id: "a", durationMinutes: 60, text: "Standup" })
    ]);
    const behind = renderView();
    await loaded();
    expect(await screen.findByText("Unlogged")).toBeInTheDocument();
    expect(card("Unlogged")).toHaveTextContent("17m");
    behind.unmount();

    days["2026-10-06"] = dayOf("2026-10-06", 480, [
      log({ id: "b", durationMinutes: 60, text: "Standup" })
    ]);
    renderView("?date=2026-10-06");
    expect(
      await screen.findByText("Tuesday, 6 October 2026")
    ).toBeInTheDocument();
    await waitFor(() => expect(card("Logged")).toHaveTextContent("1h"));
    expect(screen.queryByText("Now")).not.toBeInTheDocument();
    expect(screen.queryByText("Unlogged")).not.toBeInTheDocument();
  });

  it("AC-16 FR-TLOG-003 FR-TLOG-015 SCR-040: By Project groups collapsed, Expand all / Collapse all, By Task, Sequential in API order, tabs set view", async () => {
    const { onUrlUpdate, unmount } = renderView();
    await loaded();
    expect(
      await screen.findByRole("tab", { name: "By Project" })
    ).toHaveAttribute("aria-selected", "true");

    const manhatanGroup = group(/^Manhatan/);
    expect(manhatanGroup).toHaveTextContent("2 logs");
    expect(manhatanGroup).toHaveTextContent("2h 15m");
    expect(group(/^Unsorted/)).toHaveTextContent("15m");
    expect(group(/^Non-prod/)).toHaveTextContent("1h");
    const triggers = [
      group(/^Manhatan/),
      group(/^Unsorted/),
      group(/^Non-prod/)
    ];
    for (const t of triggers)
      expect(t).toHaveAttribute("aria-expanded", "false");
    // Groups appear in groupLogs order.
    expect(
      triggers[0].compareDocumentPosition(triggers[1]) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      triggers[1].compareDocumentPosition(triggers[2]) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
    await waitFor(() => {
      for (const t of triggers)
        expect(t).toHaveAttribute("aria-expanded", "true");
    });
    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));
    await waitFor(() => {
      for (const t of triggers)
        expect(t).toHaveAttribute("aria-expanded", "false");
    });

    // Clicking a tab sets view; By Project clears it.
    fireEvent.click(screen.getByRole("tab", { name: "By Task" }));
    await waitFor(() => expect(lastParam(onUrlUpdate, "view")).toBe("task"));
    fireEvent.click(screen.getByRole("tab", { name: "By Project" }));
    await waitFor(() => expect(lastParam(onUrlUpdate, "view")).toBeNull());
    unmount();

    const byTask = renderView("?view=task");
    await loaded();
    expect(await screen.findByRole("tab", { name: "By Task" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(group(/Specifications 01/)).toHaveTextContent("30m");
    expect(group(/Specifications 02/)).toHaveTextContent("1h 45m");
    expect(group(/^Unsorted/)).toBeInTheDocument();
    expect(group(/^Non-prod/)).toBeInTheDocument();
    byTask.unmount();

    renderView("?view=sequential");
    await loaded();
    const panel = await screen.findByRole("tabpanel");
    expect(
      within(panel)
        .getAllByText(/^(Specs review|Specs audit|Chat with coworker|Commute)$/)
        .map((el) => el.textContent)
    ).toEqual(["Specs review", "Specs audit", "Chat with coworker", "Commute"]);
    expect(within(panel).getAllByText("Excluded from statistics")).toHaveLength(
      1
    );
    expect(
      within(rowOf("Commute", panel)).getByText("Excluded from statistics")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Expand all" })
    ).not.toBeInTheDocument();
  });

  it("AC-17 FR-TLOG-003 FR-TLOG-008 SCR-042: rows per view, links, delete with confirmation", async () => {
    const byProject = renderView();
    await loaded();
    fireEvent.click(await screen.findByRole("button", { name: /^Manhatan/ }));
    await screen.findByText("Specs review");
    const review = rowOf("Specs review");
    expect(
      within(review).getByRole("link", { name: "Specifications 01" })
    ).toHaveAttribute("href", "/app/task?id=t1");
    expect(within(review).queryByText("Review")).not.toBeInTheDocument();
    expect(
      within(review).queryByRole("link", { name: "Manhatan" })
    ).not.toBeInTheDocument();
    byProject.unmount();

    renderView("?view=sequential");
    await loaded();
    const panel = await screen.findByRole("tabpanel");
    const full = rowOf("Specs review", panel);
    expect(within(full).getByText("Review")).toBeInTheDocument();
    expect(
      within(full).getByRole("link", { name: "Manhatan" })
    ).toHaveAttribute("href", "/app/project?id=p1");
    expect(
      within(full).getByRole("link", { name: "Specifications 01" })
    ).toHaveAttribute("href", "/app/task?id=t1");

    // Delete: a failure keeps the dialog, then a success closes it.
    const chat = rowOf("Chat with coworker", panel);
    fireEvent.click(within(chat).getByRole("button", { name: "Log actions" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Delete log?")).toBeInTheDocument();
    expect(
      within(dialog).getByText("This log is deleted permanently.")
    ).toBeInTheDocument();

    api.DELETE.mockResolvedValueOnce({
      error: "Internal Server Error",
      response: res(500)
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't delete the log.")
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    api.DELETE.mockResolvedValueOnce({ response: res(204) });
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Log deleted")
    );
    expect(api.DELETE).toHaveBeenLastCalledWith(
      "/api/v1/time-logs/{id}",
      expect.objectContaining({ params: { path: { id: "l3" } } })
    );
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    );
  });

  it("AC-12 FR-TLOG-019 SCR-040: Delete day: disabled on an empty day; the confirmation; Cancel, a failure, then Delete", async () => {
    days = {};
    const empty = renderView();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Day actions" }));
    expect(
      await screen.findByRole("menuitem", { name: "Delete day" })
    ).toHaveAttribute("aria-disabled", "true");
    empty.unmount();

    days = {
      "2026-10-06": dayOf("2026-10-06", 480, [
        log({ id: "d1", durationMinutes: 60, text: "Planning" }),
        log({
          id: "d2",
          durationMinutes: 30,
          text: "Review",
          project: manhatan
        })
      ])
    };
    const { onUrlUpdate } = renderView("?date=2026-10-06");
    await screen.findByText("Tuesday, 6 October 2026");
    // The day has loaded once its groups show.
    await screen.findByRole("button", { name: /^Manhatan/ });
    const openDialog = async () => {
      fireEvent.click(screen.getByRole("button", { name: "Day actions" }));
      fireEvent.click(
        await screen.findByRole("menuitem", { name: "Delete day" })
      );
      return screen.findByRole("alertdialog");
    };

    let dialog = await openDialog();
    expect(within(dialog).getByText("Delete day?")).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "Tuesday, 6 October 2026: its start time and its 2 logs (1h 30m) will be deleted permanently, with their bookings."
      )
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    );
    expect(api.DELETE).not.toHaveBeenCalled();

    dialog = await openDialog();
    api.DELETE.mockResolvedValueOnce({
      error: "Internal Server Error",
      response: res(500)
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't delete the day.")
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    api.DELETE.mockResolvedValueOnce({ response: res(204) });
    days = {};
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Day deleted")
    );
    expect(api.DELETE).toHaveBeenLastCalledWith(
      "/api/v1/workdays/{date}",
      expect.objectContaining({ params: { path: { date: "2026-10-06" } } })
    );
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    );
    expect(screen.getByText("Tuesday, 6 October 2026")).toBeInTheDocument();
    expect(
      onUrlUpdate.mock.calls.every(
        ([event]) => event.searchParams.get("date") === "2026-10-06"
      )
    ).toBe(true);
  });

  it("AC-13 FR-TLOG-014 SCR-040 SCR-042: a deleted project and task show as plain text with the deleted marker; their group has no project icon", async () => {
    const gone = log({
      id: "l5",
      durationMinutes: 15,
      text: "Old fixes",
      project: ref(null, "Old site", true),
      task: ref(null, "Old task", true)
    });
    days["2026-10-07"] = dayOf("2026-10-07", 480, [...ownerLogs, gone]);

    const byProject = renderView();
    await loaded();
    const projectIcons = (trigger: HTMLElement) =>
      trigger.querySelectorAll('span[aria-hidden="true"].rounded-md').length;
    const deletedGroup = await screen.findByRole("button", {
      name: /^Old site/
    });
    expect(
      within(deletedGroup).getByRole("img", { name: "deleted" })
    ).toBeInTheDocument();
    expect(projectIcons(deletedGroup)).toBe(0);
    expect(projectIcons(group(/^Manhatan/))).toBe(1);
    byProject.unmount();

    renderView("?view=sequential");
    await loaded();
    const panel = await screen.findByRole("tabpanel");
    const row = rowOf("Old fixes", panel);
    expect(within(row).getByText("Old site")).toBeInTheDocument();
    expect(within(row).getByText("Old task")).toBeInTheDocument();
    expect(within(row).getAllByRole("img", { name: "deleted" })).toHaveLength(
      2
    );
    expect(within(row).queryByRole("link")).toBeNull();
    expect(within(row).queryByText(/\(deleted\)/)).toBeNull();
  });

  it("AC-18 FR-TLOG-001 FR-TLOG-002 SCR-040: empty day, error with Retry, calendar marks and picking, Next / Today, a future date", async () => {
    days["2026-10-07"] = dayOf("2026-10-07", 480, []);
    const empty = renderView();
    await loaded();
    expect(await screen.findByText("No logs for this day")).toBeInTheDocument();
    expect(screen.getByText("Nothing logged yet.")).toBeInTheDocument();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    // The heading's button and the empty state's.
    expect(screen.getAllByRole("button", { name: "Log time" })).toHaveLength(2);
    empty.unmount();

    days["2026-10-07"] = dayOf("2026-10-07", 480, ownerLogs);
    dayFails = true;
    const failing = renderView();
    expect(
      await screen.findByText("Couldn't load the day.", {}, { timeout: 4000 })
    ).toBeInTheDocument();
    dayFails = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(card("Logged")).toHaveTextContent("3h 30m"));
    failing.unmount();

    // On today Next and Today are disabled; the calendar marks logged days and picks a date.
    const today = renderView();
    await loaded();
    expect(screen.getByRole("button", { name: "Next day" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Today" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Pick a date" }));
    await waitFor(() => expect(dayCell("2026-10-05")).toBeTruthy());
    await waitFor(() =>
      expect(
        api.GET.mock.calls.some(
          ([path, options]) =>
            path === "/api/v1/workdays" &&
            (options as GetOptions).params?.query?.from === "2026-10-01" &&
            (options as GetOptions).params?.query?.to === "2026-10-31"
        )
      ).toBe(true)
    );
    await waitFor(() =>
      expect(dayCell("2026-10-05").className).not.toBe(
        dayCell("2026-10-04").className
      )
    );
    // Total 0 → not marked.
    expect(dayCell("2026-10-06").className).toBe(
      dayCell("2026-10-04").className
    );
    const cell = dayCell("2026-10-05");
    fireEvent.click(cell.querySelector("button") ?? cell);
    await waitFor(() =>
      expect(lastParam(today.onUrlUpdate, "date")).toBe("2026-10-05")
    );
    today.unmount();

    // A past date: Today returns (and clears the param).
    const past = renderView("?date=2026-10-05");
    expect(
      await screen.findByText("Monday, 5 October 2026")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next day" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    await waitFor(() => expect(lastParam(past.onUrlUpdate, "date")).toBeNull());
    await loaded();
    past.unmount();

    // A future date renders today.
    renderView("?date=2026-10-20");
    await loaded();
    expect(
      api.GET.mock.calls.some(
        ([path, options]) =>
          path === "/api/v1/workdays/{date}" &&
          (options as GetOptions).params!.path!.date === "2026-10-20"
      )
    ).toBe(false);
  });

  it("AC-19 FR-TLOG-009 SCR-040: the header start saves with PUT; no start → a dash and no select; a log saved for another date moves the view", async () => {
    api.PUT.mockResolvedValue({
      data: { workDate: "2026-10-07", startMinute: 495 },
      response: res(200)
    });
    const first = renderView();
    await loaded();
    fireEvent.click(await screen.findByRole("combobox", { name: "Day start" }));
    pick(await screen.findByRole("option", { name: "08:15" }));
    await waitFor(() =>
      expect(api.PUT).toHaveBeenCalledWith(
        "/api/v1/workdays/{date}",
        expect.objectContaining({
          params: { path: { date: "2026-10-07" } },
          body: { startMinute: 495 }
        })
      )
    );
    first.unmount();

    days["2026-10-06"] = dayOf("2026-10-06", null, []);
    const noStart = renderView("?date=2026-10-06");
    expect(
      await screen.findByText("Tuesday, 6 October 2026")
    ).toBeInTheDocument();
    await waitFor(() => expect(card("Start")).toHaveTextContent("—"));
    expect(
      screen.queryByRole("combobox", { name: "Day start" })
    ).not.toBeInTheDocument();
    noStart.unmount();

    // D8: the heading's dialog saves for 5 Oct → the view moves there.
    days["2026-10-05"] = dayOf("2026-10-05", 540, []);
    api.POST.mockResolvedValueOnce({
      data: log({ id: "l9", workDate: "2026-10-05", text: "Specs review" }),
      response: res(201)
    });
    const { onUrlUpdate } = renderView();
    await loaded();
    fireEvent.click(screen.getAllByRole("button", { name: "Log time" })[0]);
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByLabelText("Date"));
    const cell = await screen.findByRole("gridcell", { name: "5" });
    fireEvent.click(cell.querySelector("button") ?? cell);
    await waitFor(() =>
      expect(within(dialog).getByLabelText("Date")).toHaveTextContent(
        "5 Oct 2026"
      )
    );
    fireEvent.change(within(dialog).getByLabelText("Log text"), {
      target: { value: "Specs review" }
    });
    fireEvent.change(within(dialog).getByLabelText("Duration"), {
      target: { value: "1" }
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Log time" }));
    await waitFor(() =>
      expect(lastParam(onUrlUpdate, "date")).toBe("2026-10-05")
    );
    expect(api.POST).toHaveBeenCalledWith(
      "/api/v1/time-logs",
      expect.objectContaining({
        body: expect.objectContaining({ workDate: "2026-10-05" })
      })
    );
  });

  it("AC-20 FR-TLOG-016 SCR-043: the pie legend and middle, the bar card title per view, Expand opens a dialog", async () => {
    const first = renderView();
    await loaded();
    for (const label of [
      "Manhatan - Specifications 01 - Specs review",
      "Manhatan - Specifications 02 - Specs audit",
      "Chat with coworker",
      "Manhatan - Commute"
    ]) {
      expect(await screen.findByText(label)).toBeInTheDocument();
    }
    const remaining = screen.getByText("Remaining").parentElement!;
    expect(remaining).toHaveTextContent("3h 30m");
    expect(screen.getByText("of 7h")).toBeInTheDocument();
    expect(screen.getByText("Time by log")).toBeInTheDocument();
    expect(screen.getByText("Time by project")).toBeInTheDocument();

    // The two charts' Expand buttons (not the logs' Expand all).
    const expand = screen.getAllByRole("button", { name: /^Expand(?! all)/ });
    expect(expand).toHaveLength(2);
    fireEvent.click(expand[0]);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    first.unmount();

    renderView("?view=task");
    await loaded();
    expect(await screen.findByText("Time by task")).toBeInTheDocument();
    expect(screen.queryByText("Time by project")).not.toBeInTheDocument();
  });
});
