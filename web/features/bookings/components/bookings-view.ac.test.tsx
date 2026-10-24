import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
import type { Ref } from "@/features/time/types";
import type { BookingLog } from "../days";
import { BookingsView } from "./bookings-view";

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
  usePathname: () => "/app/bookings",
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
const nvidia = ref("p-nvidia", "Nvidia");
const anthropic = ref("p-anthropic", "Anthropic");
const pmInternal = ref("p-pmi", "PM Internal");
const meetings = ref("t-meet", "Meetings");

const log = (over: Partial<BookingLog> & { id: string }): BookingLog => ({
  workDate: "2026-10-06",
  durationMinutes: 60,
  text: "Work",
  title: null,
  project: null,
  task: null,
  excludeFromStats: false,
  bookings: [],
  ...over
});

/** The owner's logs (spec, Acceptance criteria), in API order. */
const ownerLogs: BookingLog[] = [
  log({
    id: "g",
    workDate: "2026-09-30",
    durationMinutes: 60,
    text: "Nvidia planning",
    project: nvidia,
    task: ref("t-pm", "PM"),
    bookings: [{ date: "2026-10-01", minutes: 60 }]
  }),
  log({
    id: "a",
    durationMinutes: 120,
    text: "Anthropic sync",
    project: anthropic,
    task: meetings,
    bookings: [{ date: "2026-10-07", minutes: 120 }]
  }),
  log({
    id: "b",
    durationMinutes: 60,
    text: "Internal planning",
    project: pmInternal
  }),
  log({ id: "c", durationMinutes: 45, text: "Chat with coworker" }),
  log({
    id: "d",
    durationMinutes: 90,
    text: "Commute",
    project: anthropic,
    excludeFromStats: true
  }),
  log({
    id: "e",
    workDate: "2026-10-07",
    durationMinutes: 240,
    text: "Feature work",
    project: nvidia,
    task: ref("t-dev", "Development"),
    bookings: [{ date: "2026-10-07", minutes: 240 }]
  }),
  log({
    id: "f",
    workDate: "2026-10-07",
    durationMinutes: 135,
    text: "Client call",
    project: anthropic,
    task: meetings,
    bookings: [
      { date: "2026-10-06", minutes: 30 },
      { date: "2026-10-07", minutes: 45 }
    ]
  })
];

const res = (status: number) => new Response(null, { status });

/** What GET /bookings returns; set per test. */
let items: BookingLog[] = [];
let bookingsFail = false;

type GetOptions = { params?: { query?: Record<string, unknown> } };

function routeApi() {
  api.GET.mockImplementation(async (path: string) => {
    if (path === "/api/v1/me") return { data: me, response: res(200) };
    if (path === "/api/v1/bookings") {
      if (bookingsFail) {
        return { error: "Internal Server Error", response: res(500) };
      }
      return { data: { items }, response: res(200) };
    }
    throw new Error(`unexpected GET ${path}`);
  });
  api.PUT.mockResolvedValue({ data: { items: [] }, response: res(200) });
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
  return { onUrlUpdate, ...render(<BookingsView />, { wrapper }) };
}

const lastParam = (
  onUrlUpdate: ReturnType<typeof renderView>["onUrlUpdate"],
  name: string
) => onUrlUpdate.mock.calls.at(-1)?.[0].searchParams.get(name);

/** The ranges GET /bookings was asked for, as "from..to". */
const requestedRanges = () =>
  api.GET.mock.calls
    .filter(([path]) => path === "/api/v1/bookings")
    .map(([, options]) => {
      const query = (options as GetOptions).params?.query ?? {};
      return `${String(query.from)}..${String(query.to)}`;
    });

/** A day's section (aria-label = the work date). */
const section = (date: string) =>
  document.querySelector(`section[aria-label="${date}"]`) as HTMLElement;
const sectionDates = () =>
  [...document.querySelectorAll("section[aria-label]")].map((s) =>
    s.getAttribute("aria-label")
  );
const loaded = () => screen.findByText("Tuesday, 6 October 2026");

/** The figure card that holds a label, within a day. */
const card = (date: string, label: string) =>
  within(section(date))
    .getByText(label)
    .closest('[data-slot="card"]') as HTMLElement;

const headers = (date: string) =>
  within(section(date))
    .getAllByRole("columnheader")
    .map((h) => h.textContent?.trim());

/** The table row that holds a text (a group's name or a log's text). */
const rowOf = (date: string, text: string) =>
  within(section(date)).getByText(text).closest("tr") as HTMLElement;

/** The group rows of a day (those with the chevron), as their text. */
const groupRows = (date: string) =>
  within(section(date))
    .getAllByRole("button", { name: /^(Expand|Collapse) project$/ })
    .map((b) => b.closest("tr") as HTMLElement);

const expand = (date: string, group: string) =>
  fireEvent.click(
    within(rowOf(date, group)).getByRole("button", { name: "Expand project" })
  );

const cells = (row: HTMLElement) =>
  within(row)
    .getAllByRole("cell")
    .map((c) => c.textContent?.trim());

/** A day cell of the open calendar. */
const dayCell = (iso: string) =>
  document.querySelector(`[role="gridcell"][data-day="${iso}"]`) as HTMLElement;
const clickDay = (iso: string) => {
  const cell = dayCell(iso);
  fireEvent.click(cell.querySelector("button") ?? cell);
};

const lastPut = () =>
  (api.PUT.mock.lastCall?.[1] as { body: Record<string, unknown> }).body;

/** Picks a Select option (Base UI listens to pointer and mouse events). */
function pick(option: HTMLElement) {
  fireEvent.pointerDown(option);
  fireEvent.mouseDown(option);
  fireEvent.pointerUp(option);
  fireEvent.mouseUp(option);
  fireEvent.click(option);
}

const combobox = (name: string) => screen.getByRole("combobox", { name });

/** Opens a select and picks an entry. */
async function choose(select: string, label: string) {
  fireEvent.click(combobox(select));
  pick(await screen.findByRole("option", { name: label }));
}

const optionNames = async (select: string) => {
  fireEvent.click(combobox(select));
  await screen.findAllByRole("option");
  return screen.getAllByRole("option").map((o) => o.textContent?.trim());
};

/** The "Expand all" / "Collapse all" button of a day's heading. */
const expandAll = (date: string) =>
  within(section(date)).getByRole("button", {
    name: /^(Expand|Collapse) all$/
  });

const oldSite = log({
  id: "o",
  workDate: "2026-10-02",
  text: "Old site fixes",
  project: ref(null, "Old site", true)
});

/** The elements scrollIntoView was called on, with its options. */
const scrolls = (spy: ReturnType<typeof vi.fn>) =>
  spy.mock.contexts.map((el, i) => ({ el, options: spy.mock.calls[i][0] }));

describe("BookingsView (feat-book-web, feat-book-partial)", () => {
  beforeEach(() => {
    // "Now" is 2026-10-09 12:00 in Zagreb; only Date is faked, timers stay real.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-09T10:00:00.000Z"));
    Object.values(api).forEach((fn) => fn.mockReset());
    items = ownerLogs;
    bookingsFail = false;
    routeApi();
    toast.success.mockReset();
    toast.error.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC-7 FR-BOOK-001 FR-BOOK-002 SCR-045: heading, range label, the days oldest first with full dates, the figures, Today", async () => {
    const first = renderView();
    await loaded();
    expect(
      screen.getByRole("heading", { name: "Bookings" })
    ).toBeInTheDocument();
    expect(screen.getByText("October 2026")).toBeInTheDocument();
    expect(requestedRanges()).toContain("2026-10-01..2026-10-09");
    expect(sectionDates()).toEqual(["2026-10-01", "2026-10-06", "2026-10-07"]);
    expect(
      within(section("2026-10-01")).getByText("Thursday, 1 October 2026")
    ).toBeInTheDocument();
    expect(
      within(section("2026-10-07")).getByText("Wednesday, 7 October 2026")
    ).toBeInTheDocument();

    const seventh = "2026-10-07";
    expect(card(seventh, "Logged")).toHaveTextContent("6h 15m");
    expect(card(seventh, "Billable")).toHaveTextContent("6h 15m");
    expect(card(seventh, "Overtime")).toHaveTextContent("0h");
    expect(card(seventh, "Booked current")).toHaveTextContent("4h 45m");
    expect(card(seventh, "Booked from external")).toHaveTextContent("2h");
    expect(card(seventh, "Booked total")).toHaveTextContent("6h 45m");
    expect(screen.queryByText("Today")).not.toBeInTheDocument();
    first.unmount();

    items = [
      ...ownerLogs,
      log({
        id: "h",
        workDate: "2026-10-09",
        durationMinutes: 30,
        text: "Standup",
        project: pmInternal
      })
    ];
    renderView();
    await loaded();
    expect(sectionDates()).toEqual([
      "2026-10-01",
      "2026-10-06",
      "2026-10-07",
      "2026-10-09"
    ]);
    expect(
      within(section("2026-10-09")).getByText("Friday, 9 October 2026")
    ).toBeInTheDocument();
    expect(
      within(section("2026-10-09")).getByText("Today")
    ).toBeInTheDocument();
    expect(screen.getAllByText("Today")).toHaveLength(1);
  });

  it("AC-8 AC-17 FR-BOOK-003 FR-BOOK-005 SCR-045: collapsed columns (blank headers over the expanded-only columns), group order, Book all only with unbooked logs and in the row in both states, a row click expands", async () => {
    renderView();
    await loaded();
    const sixth = "2026-10-06";
    expect(headers(sixth)).toEqual([
      "Project",
      "",
      "",
      "",
      "",
      "Hours worked",
      "Hours booked"
    ]);
    const rows = groupRows(sixth);
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining("Anthropic"),
      expect.stringContaining("PM Internal"),
      expect.stringContaining("Unsorted"),
      expect.stringContaining("Non-prod")
    ]);
    expect(
      within(rows[0]).getByRole("link", { name: "Anthropic" })
    ).toHaveAttribute("href", "/app/project?id=p-anthropic");
    expect(within(rows[2]).queryByRole("link")).not.toBeInTheDocument();

    // Book all: only PM Internal on 6 Oct and Anthropic on 7 Oct.
    expect(
      within(section(sixth)).getAllByRole("button", { name: "Book all" })
    ).toHaveLength(1);
    expect(
      within(rows[1]).getByRole("button", { name: "Book all" })
    ).toBeInTheDocument();
    expect(
      within(section("2026-10-07")).getAllByRole("button", { name: "Book all" })
    ).toHaveLength(1);
    expect(
      within(rowOf("2026-10-07", "Anthropic")).getByRole("button", {
        name: "Book all"
      })
    ).toBeInTheDocument();
    expect(
      within(section("2026-10-01")).queryByRole("button", { name: "Book all" })
    ).not.toBeInTheDocument();

    // Clicking the row (not its link or button) expands it; the other days stay collapsed.
    for (const r of rows) {
      expect(
        within(r).getByRole("button", { name: "Expand project" })
      ).toHaveAttribute("aria-expanded", "false");
    }
    fireEvent.click(rows[1]);
    await waitFor(() =>
      expect(headers(sixth)).toEqual([
        "Project",
        "Tasks",
        "Logs",
        "Booking date",
        "Booking time",
        "Hours worked",
        "Hours booked"
      ])
    );
    expect(
      within(rowOf(sixth, "PM Internal")).getByRole("button", {
        name: "Collapse project"
      })
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      within(rowOf(sixth, "PM Internal")).getByRole("button", {
        name: "Book all"
      })
    ).toBeInTheDocument();
    expect(rowOf(sixth, "Internal planning")).toBeTruthy();
    expect(headers("2026-10-07")).toEqual([
      "Project",
      "",
      "",
      "",
      "",
      "Hours worked",
      "Hours booked"
    ]);

    fireEvent.click(
      within(rowOf(sixth, "PM Internal")).getByRole("button", {
        name: "Collapse project"
      })
    );
    await waitFor(() =>
      expect(headers(sixth)).toEqual([
        "Project",
        "",
        "",
        "",
        "",
        "Hours worked",
        "Hours booked"
      ])
    );
  });

  it("AC-9 FR-BOOK-003 FR-BOOK-004 SCR-045: log rows — task link, text, booking date, incoming, Unsorted, Non-prod, an unbooked log", async () => {
    renderView();
    await loaded();
    const sixth = "2026-10-06";
    expand(sixth, "Anthropic");
    expand(sixth, "PM Internal");
    expand(sixth, "Unsorted");
    expand(sixth, "Non-prod");

    const rowA = await waitFor(() => rowOf(sixth, "Anthropic sync"));
    expect(
      within(rowA).getByRole("link", { name: "Meetings" })
    ).toHaveAttribute("href", "/app/task?id=t-meet");
    expect(rowA).toHaveTextContent("7 Oct 2026");
    expect(cells(rowA).at(-2)).toBe("2h");
    expect(cells(rowA).at(-1)).toBe("0h");
    expect(
      within(rowA).getByRole("button", { name: "Edit booking" })
    ).toBeInTheDocument();
    expect(
      within(rowA).getByRole("button", { name: "Remove booking" })
    ).toBeInTheDocument();

    const rowC = rowOf(sixth, "Chat with coworker");
    expect(rowC).toHaveTextContent("Add the log to a Project or Task");
    expect(within(rowC).queryAllByRole("button")).toHaveLength(0);

    const rowD = rowOf(sixth, "Commute");
    expect(within(rowD).queryAllByRole("button")).toHaveLength(0);
    expect(rowD).not.toHaveTextContent("Add the log to a Project or Task");

    const rowB = rowOf(sixth, "Internal planning");
    expect(within(rowB).getByText("—")).toBeInTheDocument();
    expect(
      within(rowB).getByRole("button", { name: /6 Oct 2026/ })
    ).toBeInTheDocument();
    expect(
      within(rowB).getByRole("button", { name: "Book" })
    ).toBeInTheDocument();
    expect(
      within(rowB).getByRole("textbox", { name: "Booking time" })
    ).toHaveValue("1h");

    // f comes in to 6 Oct with its 30m part.
    const fIn = rowOf(sixth, "Client call");
    expect(fIn).toHaveTextContent("Worked on 7 Oct 2026");
    expect(within(fIn).queryAllByRole("button")).toHaveLength(0);
    expect(cells(fIn).at(-1)).toBe("30m");

    // On 7 Oct, a is an incoming log: where it was worked, no actions.
    expand("2026-10-07", "Anthropic");
    const incoming = await waitFor(() => rowOf("2026-10-07", "Anthropic sync"));
    expect(incoming).toHaveTextContent("Worked on 6 Oct 2026");
    expect(within(incoming).queryAllByRole("button")).toHaveLength(0);
    expect(cells(incoming).at(-2)).toBe("0h");
    expect(cells(incoming).at(-1)).toBe("2h");
  });

  it("AC-22 FR-BOOK-004 FR-BOOK-005 SCR-045 OQ-212: Book with a Booking time, its checks, Book all, Remove, Edit + Save, Cancel, a failure toast", async () => {
    renderView();
    await loaded();
    const sixth = "2026-10-06";
    const seventh = "2026-10-07";

    // b's unbooked row: Book books all of it to the work date.
    expand(sixth, "PM Internal");
    const rowB = () => rowOf(sixth, "Internal planning");
    await waitFor(() => rowB());
    const time = () =>
      within(rowB()).getByRole("textbox", { name: "Booking time" });
    const book = () => within(rowB()).getByRole("button", { name: "Book" });
    fireEvent.click(book());
    await waitFor(() =>
      expect(api.PUT).toHaveBeenCalledWith(
        "/api/v1/bookings",
        expect.objectContaining({
          body: {
            logs: [
              {
                logId: "b",
                bookings: [{ date: "2026-10-06", minutes: 60 }]
              }
            ]
          }
        })
      )
    );

    // A part of it.
    await waitFor(() => expect(book()).toBeEnabled());
    fireEvent.change(time(), { target: { value: "30m" } });
    fireEvent.click(book());
    await waitFor(() =>
      expect(lastPut()).toEqual({
        logs: [{ logId: "b", bookings: [{ date: "2026-10-06", minutes: 30 }] }]
      })
    );

    // More than is left, or off the 15-minute step: an error under the input, Book disabled.
    await waitFor(() => expect(book()).toBeEnabled());
    const puts = () => api.PUT.mock.calls.length;
    const sent = puts();
    fireEvent.change(time(), { target: { value: "1h 15m" } });
    expect(await within(rowB()).findByText("At most 1h.")).toBeInTheDocument();
    expect(book()).toBeDisabled();
    fireEvent.change(time(), { target: { value: "20m" } });
    expect(
      await within(rowB()).findByText("Use 15-minute steps.")
    ).toBeInTheDocument();
    expect(book()).toBeDisabled();
    expect(puts()).toBe(sent);

    // Book all on Anthropic (7 Oct) adds f's unbooked hour to its 7 Oct booking.
    fireEvent.click(
      within(rowOf(seventh, "Anthropic")).getByRole("button", {
        name: "Book all"
      })
    );
    await waitFor(() =>
      expect(lastPut()).toEqual({
        logs: [
          {
            logId: "f",
            bookings: [
              { date: "2026-10-06", minutes: 30 },
              { date: "2026-10-07", minutes: 105 }
            ]
          }
        ]
      })
    );

    // Remove booking on f's 6 Oct row (its first row on 7 Oct) keeps the other one.
    expand(seventh, "Anthropic");
    const rowF = await waitFor(() => rowOf(seventh, "Client call"));
    expect(rowF).toHaveTextContent("6 Oct 2026");
    fireEvent.click(
      within(rowF).getByRole("button", { name: "Remove booking" })
    );
    await waitFor(() =>
      expect(lastPut()).toEqual({
        logs: [{ logId: "f", bookings: [{ date: "2026-10-07", minutes: 45 }] }]
      })
    );

    // Edit e's booking: the date field opens at the booking date; pick 8 Oct, 2h, Save booking.
    expand(seventh, "Nvidia");
    const rowE = () => rowOf(seventh, "Feature work");
    await waitFor(() => rowE());
    fireEvent.click(
      within(rowE()).getByRole("button", { name: "Edit booking" })
    );
    fireEvent.click(within(rowE()).getByRole("button", { name: /7 Oct 2026/ }));
    await waitFor(() => expect(dayCell("2026-10-08")).toBeTruthy());
    clickDay("2026-10-08");
    await waitFor(() =>
      expect(
        within(rowE()).getByRole("button", { name: /8 Oct 2026/ })
      ).toBeInTheDocument()
    );
    fireEvent.change(
      within(rowE()).getByRole("textbox", { name: "Booking time" }),
      { target: { value: "2h" } }
    );
    fireEvent.click(
      within(rowE()).getByRole("button", { name: "Save booking" })
    );
    await waitFor(() =>
      expect(lastPut()).toEqual({
        logs: [{ logId: "e", bookings: [{ date: "2026-10-08", minutes: 120 }] }]
      })
    );
    // Save closes the editor.
    await waitFor(() =>
      expect(
        within(rowE()).queryByRole("button", { name: "Save booking" })
      ).not.toBeInTheDocument()
    );

    // Cancel sends nothing.
    const beforeCancel = puts();
    fireEvent.click(
      within(rowE()).getByRole("button", { name: "Edit booking" })
    );
    fireEvent.click(within(rowE()).getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(
        within(rowE()).getByRole("button", { name: "Edit booking" })
      ).toBeInTheDocument()
    );
    expect(puts()).toBe(beforeCancel);

    // A failure → toast.
    api.PUT.mockResolvedValueOnce({
      error: "Internal Server Error",
      response: res(500)
    });
    fireEvent.click(
      within(rowE()).getByRole("button", { name: "Remove booking" })
    );
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't save the booking.")
    );
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("AC-11 FR-BOOK-001 OQ-125 SCR-045: Submit a picked range to the URL, the default range clears it, an invalid range, empty and error states", async () => {
    const picked = renderView();
    await loaded();
    const trigger = screen
      .getAllByRole("button")
      .find(
        (b) =>
          b.textContent?.includes("1 Oct 2026") &&
          b.textContent.includes("9 Oct 2026")
      )!;
    fireEvent.click(trigger);
    await waitFor(() => expect(dayCell("2026-10-09")).toBeTruthy());
    fireEvent.click(
      screen.getByRole("button", { name: "Go to the Previous Month" })
    );
    await waitFor(() => expect(dayCell("2026-09-01")).toBeTruthy());
    clickDay("2026-09-01");
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
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
    picked.unmount();

    // Submitting the default range removes both parameters.
    const explicit = renderView("?from=2026-10-01&to=2026-10-09");
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await waitFor(() => expect(explicit.onUrlUpdate).toHaveBeenCalled());
    expect(lastParam(explicit.onUrlUpdate, "from")).toBeNull();
    expect(lastParam(explicit.onUrlUpdate, "to")).toBeNull();
    explicit.unmount();

    // An invalid range shows the default one.
    api.GET.mockClear();
    const invalid = renderView("?from=2026-10-05&to=2026-10-01");
    await loaded();
    expect(screen.getByText("October 2026")).toBeInTheDocument();
    expect(requestedRanges()).toEqual(["2026-10-01..2026-10-09"]);
    invalid.unmount();

    items = [];
    const empty = renderView();
    expect(
      await screen.findByText("No logs in this range")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Pick another time range or project.")
    ).toBeInTheDocument();
    empty.unmount();

    items = ownerLogs;
    bookingsFail = true;
    renderView();
    expect(
      await screen.findByText(
        "Couldn't load the bookings.",
        {},
        { timeout: 4000 }
      )
    ).toBeInTheDocument();
    bookingsFail = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await loaded();
  });

  describe("day links (feat-proto-sync-logged-chart)", () => {
    it("AC-7 FR-BOOK-001 SCR-045: each day title links to that day in Logs, with the date in full", async () => {
      renderView();
      await loaded();

      const titles = {
        "2026-10-01": "Thursday, 1 October 2026",
        "2026-10-06": "Tuesday, 6 October 2026",
        "2026-10-07": "Wednesday, 7 October 2026"
      };
      expect(sectionDates()).toEqual(Object.keys(titles));
      for (const [date, title] of Object.entries(titles)) {
        expect(
          within(section(date)).getByRole("link", { name: title })
        ).toHaveAttribute("href", `/app/time?date=${date}`);
      }
    });
  });

  describe("navigation (feat-book-web-nav)", () => {
    const scrollIntoView = vi.fn();
    beforeEach(() => {
      scrollIntoView.mockReset();
      Element.prototype.scrollIntoView = scrollIntoView;
    });
    afterEach(() => {
      window.history.replaceState(null, "", "/");
    });

    it("AC-4 FR-BOOK-001 SCR-045: the Range preset select — options, a preset applies at once, the default clears the URL, Custom range opens the calendar", async () => {
      const first = renderView();
      await loaded();
      expect(combobox("Range preset")).toHaveTextContent("This month");
      expect(await optionNames("Range preset")).toEqual([
        "This month",
        "Last month",
        "Last 7 days",
        "Last 30 days",
        "Last 90 days",
        "This year",
        "Custom range"
      ]);
      pick(screen.getByRole("option", { name: "Last 7 days" }));
      await waitFor(() =>
        expect(lastParam(first.onUrlUpdate, "from")).toBe("2026-10-03")
      );
      expect(lastParam(first.onUrlUpdate, "to")).toBe("2026-10-09");
      await waitFor(() =>
        expect(requestedRanges()).toContain("2026-10-03..2026-10-09")
      );
      first.unmount();

      const lastMonth = renderView("?from=2026-09-01&to=2026-09-30");
      await waitFor(() =>
        expect(combobox("Range preset")).toHaveTextContent("Last month")
      );
      await choose("Range preset", "This month");
      await waitFor(() => expect(lastMonth.onUrlUpdate).toHaveBeenCalled());
      expect(lastParam(lastMonth.onUrlUpdate, "from")).toBeNull();
      expect(lastParam(lastMonth.onUrlUpdate, "to")).toBeNull();
      lastMonth.unmount();

      renderView("?from=2026-09-15&to=2026-10-09");
      await loaded();
      expect(combobox("Range preset")).toHaveTextContent("Custom range");
      expect(dayCell("2026-10-09")).toBeNull();
      await choose("Range preset", "Custom range");
      await waitFor(() => expect(dayCell("2026-10-09")).toBeTruthy());
    });

    it("AC-5 FR-BOOK-007 SCR-045: the Project filter — options, a project in the URL lists and sums only its logs, an unknown one is All projects, a deleted one", async () => {
      const first = renderView();
      await loaded();
      expect(combobox("Project")).toHaveTextContent("All projects");
      expect(await optionNames("Project")).toEqual([
        "All projects",
        "Anthropic",
        "Nvidia",
        "PM Internal"
      ]);
      pick(screen.getByRole("option", { name: "Anthropic" }));
      await waitFor(() =>
        expect(lastParam(first.onUrlUpdate, "project")).toBe("p-anthropic")
      );
      await waitFor(() =>
        expect(sectionDates()).toEqual(["2026-10-06", "2026-10-07"])
      );
      const seventh = "2026-10-07";
      expect(card(seventh, "Logged")).toHaveTextContent("2h 15m");
      expect(card(seventh, "Billable")).toHaveTextContent("2h 15m");
      expect(card(seventh, "Overtime")).toHaveTextContent("0h");
      expect(card(seventh, "Booked current")).toHaveTextContent("45m");
      expect(card(seventh, "Booked from external")).toHaveTextContent("2h");
      expect(card(seventh, "Booked total")).toHaveTextContent("2h 45m");
      const sixth = "2026-10-06";
      expect(card(sixth, "Logged")).toHaveTextContent("3h 30m");
      expect(card(sixth, "Billable")).toHaveTextContent("2h");
      expect(card(sixth, "Booked current")).toHaveTextContent("0h");
      expect(card(sixth, "Booked from external")).toHaveTextContent("30m");
      expect(card(sixth, "Booked total")).toHaveTextContent("30m");
      first.unmount();

      const unknown = renderView("?project=p-unknown");
      await loaded();
      expect(combobox("Project")).toHaveTextContent("All projects");
      expect(sectionDates()).toEqual([
        "2026-10-01",
        "2026-10-06",
        "2026-10-07"
      ]);
      unknown.unmount();

      items = [...ownerLogs, oldSite];
      renderView(`?project=${encodeURIComponent("deleted:Old site")}`);
      await waitFor(() => expect(sectionDates()).toEqual(["2026-10-02"]));
    });

    it("AC-6 FR-BOOK-003 SCR-045: Expand all / Collapse all expands and collapses every group of that day only; the first header is Project", async () => {
      renderView();
      await loaded();
      const sixth = "2026-10-06";
      for (const date of ["2026-10-01", sixth, "2026-10-07"]) {
        expect(expandAll(date)).toHaveTextContent("Expand all");
        expect(expandAll(date)).toHaveAttribute("aria-expanded", "false");
      }
      expect(headers(sixth)[0]).toBe("Project");

      fireEvent.click(expandAll(sixth));
      await waitFor(() =>
        expect(expandAll(sixth)).toHaveTextContent("Collapse all")
      );
      expect(expandAll(sixth)).toHaveAttribute("aria-expanded", "true");
      const rows = groupRows(sixth);
      expect(rows).toHaveLength(4);
      for (const r of rows) {
        expect(
          within(r).getByRole("button", { name: "Collapse project" })
        ).toHaveAttribute("aria-expanded", "true");
      }
      expect(headers(sixth)[0]).toBe("Project");
      expect(expandAll("2026-10-07")).toHaveTextContent("Expand all");
      for (const r of groupRows("2026-10-07")) {
        expect(
          within(r).getByRole("button", { name: "Expand project" })
        ).toHaveAttribute("aria-expanded", "false");
      }

      fireEvent.click(expandAll(sixth));
      await waitFor(() =>
        expect(expandAll(sixth)).toHaveTextContent("Expand all")
      );
      expect(expandAll(sixth)).toHaveAttribute("aria-expanded", "false");
      for (const r of groupRows(sixth)) {
        expect(
          within(r).getByRole("button", { name: "Expand project" })
        ).toHaveAttribute("aria-expanded", "false");
      }
    });

    it("AC-7 FR-BOOK-008 SCR-045: day anchors; Booked to and Worked on link to the other end of a booking, in the page or that day's month", async () => {
      const first = renderView();
      await loaded();
      for (const date of ["2026-10-01", "2026-10-06", "2026-10-07"]) {
        expect(section(date)).toHaveAttribute("id", `day-${date}`);
      }

      expand("2026-10-06", "Anthropic");
      const rowA = await waitFor(() => rowOf("2026-10-06", "Anthropic sync"));
      expect(
        within(rowA).getByRole("link", { name: "Booked to 7 Oct 2026" })
      ).toHaveAttribute("href", "#day-2026-10-07.log-a.to-2026-10-07");
      expect(
        within(rowA).getByRole("button", { name: "Edit booking" })
      ).toBeInTheDocument();
      expect(
        within(rowA).getByRole("button", { name: "Remove booking" })
      ).toBeInTheDocument();

      expand("2026-10-07", "Nvidia");
      const rowE = await waitFor(() => rowOf("2026-10-07", "Feature work"));
      expect(rowE).toHaveTextContent("7 Oct 2026");
      expect(
        within(rowE).queryByRole("link", { name: /Oct 2026/ })
      ).not.toBeInTheDocument();

      expand("2026-10-07", "Anthropic");
      const incomingA = await waitFor(() =>
        rowOf("2026-10-07", "Anthropic sync")
      );
      expect(
        within(incomingA).getByRole("link", { name: "Worked on 6 Oct 2026" })
      ).toHaveAttribute("href", "#day-2026-10-06.log-a.to-2026-10-07");

      expand("2026-10-01", "Nvidia");
      const incomingG = await waitFor(() =>
        rowOf("2026-10-01", "Nvidia planning")
      );
      expect(
        within(incomingG).getByRole("link", { name: "Worked on 30 Sep 2026" })
      ).toHaveAttribute(
        "href",
        "/app/bookings?from=2026-09-01&to=2026-09-30#day-2026-09-30.log-g.to-2026-10-01"
      );
      first.unmount();

      renderView("?project=p-nvidia");
      await waitFor(() =>
        expect(sectionDates()).toEqual(["2026-10-01", "2026-10-07"])
      );
      expand("2026-10-01", "Nvidia");
      const filteredG = await waitFor(() =>
        rowOf("2026-10-01", "Nvidia planning")
      );
      expect(
        within(filteredG).getByRole("link", { name: "Worked on 30 Sep 2026" })
      ).toHaveAttribute(
        "href",
        "/app/bookings?from=2026-09-01&to=2026-09-30&project=p-nvidia#day-2026-09-30.log-g.to-2026-10-01"
      );
    });

    it("AC-8 FR-BOOK-008: a link to a listed day changes only the hash, expands that day and scrolls to the booking's row", async () => {
      const view = renderView();
      await loaded();
      expand("2026-10-06", "Anthropic");
      const rowA = await waitFor(() => rowOf("2026-10-06", "Anthropic sync"));
      const urlUpdates = view.onUrlUpdate.mock.calls.length;
      fireEvent.click(
        within(rowA).getByRole("link", { name: "Booked to 7 Oct 2026" })
      );

      expect(window.location.hash).toBe("#day-2026-10-07.log-a.to-2026-10-07");
      const target = () =>
        section("2026-10-07").querySelector('tr[data-booking="a:2026-10-07"]');
      await waitFor(() =>
        expect(scrolls(scrollIntoView)).toContainEqual({
          el: target(),
          options: { behavior: "smooth", block: "center" }
        })
      );
      expect(target()).not.toBeNull();
      const rows = groupRows("2026-10-07");
      expect(rows).toHaveLength(2);
      for (const r of rows) {
        expect(
          within(r).getByRole("button", { name: "Collapse project" })
        ).toHaveAttribute("aria-expanded", "true");
      }
      expect(view.onUrlUpdate.mock.calls.length).toBe(urlUpdates);
    });

    it("AC-9 FR-BOOK-008: opened with a hash, the page expands that day and scrolls to the booking's row, or to the day", async () => {
      window.history.replaceState(
        null,
        "",
        "/app/bookings#day-2026-10-06.log-f.to-2026-10-06"
      );
      const first = renderView();
      await loaded();
      const rowF = () =>
        section("2026-10-06").querySelector('tr[data-booking="f:2026-10-06"]');
      await waitFor(() =>
        expect(scrolls(scrollIntoView)).toContainEqual({
          el: rowF(),
          options: { behavior: "smooth", block: "center" }
        })
      );
      expect(rowF()).not.toBeNull();
      for (const r of groupRows("2026-10-06")) {
        expect(
          within(r).getByRole("button", { name: "Collapse project" })
        ).toHaveAttribute("aria-expanded", "true");
      }
      first.unmount();

      scrollIntoView.mockReset();
      window.history.replaceState(null, "", "/app/bookings#day-2026-10-07");
      renderView();
      await loaded();
      await waitFor(() =>
        expect(scrolls(scrollIntoView)).toContainEqual({
          el: section("2026-10-07"),
          options: { behavior: "smooth", block: "start" }
        })
      );
      for (const r of groupRows("2026-10-07")) {
        expect(
          within(r).getByRole("button", { name: "Expand project" })
        ).toHaveAttribute("aria-expanded", "false");
      }
    });
  });
});
