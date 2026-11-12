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

/** The open panel, once the day has loaded and Manhatan's group shows. */
async function panelOf() {
  const panel = await screen.findByRole("tabpanel");
  await within(panel).findByRole("button", { name: /^Manhatan/ });
  return panel;
}

/** A group's accordion trigger (it has aria-expanded; its + doesn't). */
const group = (panel: HTMLElement, name: RegExp) => {
  const triggers = within(panel)
    .getAllByRole("button", { name })
    .filter((el) => el.hasAttribute("aria-expanded"));
  expect(triggers).toHaveLength(1);
  return triggers[0];
};

/** The names of the + buttons in a container, in order. */
const plusNames = (container: HTMLElement) =>
  within(container)
    .queryAllByRole("button", { name: /^Log time to / })
    .map((b) => b.getAttribute("aria-label"));

/** The Log time / Edit log dialog's field. */
const field = (label: RegExp) =>
  within(screen.getByRole("dialog")).getByLabelText(label) as HTMLInputElement;

/** Timeline's rows (one list item per log). */
const rowsIn = (panel: HTMLElement) => within(panel).queryAllByRole("listitem");

/** The By Project / By Task row that holds a log text (the nearest ancestor with the row's ⋯ menu). */
function rowOf(panel: HTMLElement, text: string) {
  let el: HTMLElement | null = within(panel).getByText(text);
  while (el && !within(el).queryByRole("button", { name: "Log actions" })) {
    el = el.parentElement;
  }
  return el!;
}

/** A Non-prod log on Manhatan with a live task, and a log of a deleted project and task. */
const nonProdWithTask = log({
  id: "l5",
  durationMinutes: 15,
  text: "Travel to client",
  project: manhatan,
  task: ref("t1", "Specifications 01"),
  excludeFromStats: true
});
const gone = log({
  id: "l6",
  durationMinutes: 15,
  text: "Old fixes",
  project: ref(null, "Old site", true),
  task: ref(null, "Old task", true)
});

describe("Logs: + and ⋯ in Timeline, + after a row's task (feat-tlog-views-actions)", () => {
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

  it("AC-1 FR-TLOG-023 FR-TLOG-004 SCR-040: a Timeline project group has the + preset to its project, without toggling the group", async () => {
    renderView();
    const panel = await panelOf();
    expect(plusNames(panel)).toEqual(["Log time to Manhatan"]);
    const manhatanGroup = group(panel, /^Manhatan/);
    fireEvent.click(
      within(panel).getByRole("button", { name: "Log time to Manhatan" })
    );
    expect(
      await screen.findByRole("heading", { name: "Log time" })
    ).toBeInTheDocument();
    await waitFor(() => expect(field(/^Project/).value).toBe("Manhatan"));
    expect(field(/^Task/).value).toBe("");
    expect(manhatanGroup).toHaveAttribute("aria-expanded", "false");
  });

  it("AC-2 FR-TLOG-023 FR-TLOG-004 SCR-040: an open Timeline row has a + after its task, preset to the task and its project", async () => {
    renderView();
    const panel = await panelOf();
    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
    await waitFor(() => expect(rowsIn(panel)).toHaveLength(4));
    expect(plusNames(panel)).toEqual([
      "Log time to Manhatan",
      "Log time to Specifications 01",
      "Log time to Specifications 02"
    ]);
    const manhatanGroup = group(panel, /^Manhatan/);
    fireEvent.click(
      within(panel).getByRole("button", {
        name: "Log time to Specifications 02"
      })
    );
    expect(
      await screen.findByRole("heading", { name: "Log time" })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(field(/^Task/).value).toBe("Manhatan · Specifications 02")
    );
    expect(field(/^Project/).value).toBe("Manhatan");
    expect(manhatanGroup).toHaveAttribute("aria-expanded", "true");
  });

  it("AC-3 FR-TLOG-023 FR-TLOG-006 FR-TLOG-008 SCR-040 SCR-042: each open Timeline row has the log's ⋯ menu with Edit and Delete", async () => {
    renderView();
    const panel = await panelOf();
    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
    await waitFor(() => expect(rowsIn(panel)).toHaveLength(4));
    const rows = rowsIn(panel);
    rows.forEach((row) =>
      expect(
        within(row).getByRole("button", { name: "Log actions" })
      ).toBeInTheDocument()
    );

    fireEvent.click(
      within(rows[0]).getByRole("button", { name: "Log actions" })
    );
    fireEvent.click(await screen.findByRole("menuitem", { name: "Edit" }));
    expect(
      await screen.findByRole("heading", { name: "Edit log" })
    ).toBeInTheDocument();
    expect(field(/^Log text/).value).toBe("Specs review");
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Cancel"
      })
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );

    const chat = rows.find((r) =>
      r.textContent?.includes("Chat with coworker")
    )!;
    fireEvent.click(within(chat).getByRole("button", { name: "Log actions" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Delete log?")).toBeInTheDocument();
  });

  it("AC-4 FR-TLOG-023 FR-TLOG-014 SCR-040: a Non-prod row's live task has a +; a deleted task has none", async () => {
    days["2026-10-07"] = dayOf("2026-10-07", 480, [
      ...ownerLogs,
      nonProdWithTask,
      gone
    ]);
    renderView();
    const panel = await panelOf();
    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
    await waitFor(() => expect(rowsIn(panel)).toHaveLength(6));
    const rowWith = (text: string) =>
      rowsIn(panel).find((r) => r.textContent?.includes(text))!;
    expect(plusNames(rowWith("Travel to client"))).toEqual([
      "Log time to Specifications 01"
    ]);
    expect(plusNames(rowWith("Old fixes"))).toEqual([]);
    expect(plusNames(rowWith("Commute"))).toEqual([]);
    expect(plusNames(rowWith("Chat with coworker"))).toEqual([]);
  });

  it("AC-5 FR-TLOG-003 FR-TLOG-004 SCR-042: By Project rows have a + after a live task, preset to it, without toggling the group", async () => {
    renderView("?view=project");
    const panel = await panelOf();
    const manhatanGroup = group(panel, /^Manhatan/);
    fireEvent.click(manhatanGroup);
    await within(panel).findByText("Specs audit");
    expect(plusNames(rowOf(panel, "Specs review"))).toEqual([
      "Log time to Specifications 01"
    ]);
    expect(plusNames(rowOf(panel, "Specs audit"))).toEqual([
      "Log time to Specifications 02"
    ]);

    fireEvent.click(group(panel, /^Unsorted/));
    await within(panel).findByText("Chat with coworker");
    expect(plusNames(rowOf(panel, "Chat with coworker"))).toEqual([]);

    fireEvent.click(
      within(rowOf(panel, "Specs review")).getByRole("button", {
        name: "Log time to Specifications 01"
      })
    );
    expect(
      await screen.findByRole("heading", { name: "Log time" })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(field(/^Task/).value).toBe("Manhatan · Specifications 01")
    );
    expect(field(/^Project/).value).toBe("Manhatan");
    expect(manhatanGroup).toHaveAttribute("aria-expanded", "true");
  });

  it("AC-6 FR-TLOG-015 FR-TLOG-002 SCR-042: a By Task Non-prod row's live task has a +; Sequential rows have none", async () => {
    days["2026-10-07"] = dayOf("2026-10-07", 480, [
      ...ownerLogs,
      nonProdWithTask
    ]);
    const byTask = renderView("?view=task");
    const panel = await screen.findByRole("tabpanel");
    fireEvent.click(
      await within(panel).findByRole("button", { name: /^Non-prod/ })
    );
    await within(panel).findByText("Travel to client");
    expect(plusNames(rowOf(panel, "Travel to client"))).toEqual([
      "Log time to Specifications 01"
    ]);
    expect(plusNames(rowOf(panel, "Commute"))).toEqual([]);
    byTask.unmount();

    renderView("?view=sequential");
    const sequential = await screen.findByRole("tabpanel");
    await within(sequential).findByText("Travel to client");
    expect(plusNames(sequential)).toEqual([]);
  });
});
