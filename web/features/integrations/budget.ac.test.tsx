import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps, ReactNode } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor
} from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import type { components } from "@/lib/api/schema";
import {
  useImportPreview,
  useLoadAllPmspaTasks,
  useLoadPmspaDays,
  usePmspaCandidates,
  usePmspaConnection,
  usePmspaDay,
  usePmspaDays,
  usePmspaProjects,
  usePmspaTasks
} from "./api";
import { PmspaRateLimit } from "./components/pmspa-rate-limit";
import { ProfileIntegrations } from "./components/profile-integrations";
import { SyncPreviewDialog } from "./components/sync-preview-dialog";

type S = components["schemas"];

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  PUT: vi.fn(),
  POST: vi.fn(),
  DELETE: vi.fn()
}));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

// next/link applies its own href normalization outside a Next build. A plain anchor keeps the exact href.
vi.mock("next/link", () => ({
  default: ({ href, ...props }: { href: string } & ComponentProps<"a">) => (
    <a href={href} {...props} />
  )
}));

const REMOTE = ["integrations", "pmspa", "remote"];
const CONNECTION_KEY = ["integrations", "pmspa", "connection"];
const tasksKey = (projectId: string) => [...REMOTE, "tasks", projectId];
const dayKey = (date: string) => [...REMOTE, "day", date];

const res = (status: number) => new Response(null, { status });
const ok = <T,>(data: T) => ({ data, response: res(200) });
const failed = (status: number, slug: string, extra = {}) => ({
  error: {
    type: `https://pm4.angelovski.top/errors/${slug}`,
    title: "Error",
    status,
    detail: "Error.",
    ...extra
  },
  response: res(status)
});

const connection = (
  over: Partial<S["PmspaConnectionResponseDto"]> = {}
): S["PmspaConnectionResponseDto"] => ({
  status: "connected",
  url: "https://pmspa.example.com",
  email: "me@example.com",
  account: {
    id: "u1",
    email: "pmspa-me@example.com",
    avatarUrl: null,
    role: "admin"
  },
  lastCheckedAt: "2026-10-17T09:00:00.000Z",
  lastSyncAt: null,
  rateLimit: null,
  ...over
});

const task = (id: string, projectId: string): S["PmspaTaskDto"] => ({
  id,
  projectId,
  title: `Task ${id}`,
  column: "In Progress",
  link: null
});

const day = (date: string): S["PmspaDayDto"] => ({
  date,
  startMinute: 480,
  totalMinutes: 60,
  linkState: "not-linked",
  events: []
});

function wrapperFor(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function setup<T>(hook: () => T, queryClient = createQueryClient()) {
  return {
    queryClient,
    ...renderHook(hook, { wrapper: wrapperFor(queryClient) })
  };
}

const pathCalls = (mock: typeof api.GET, path: string) =>
  mock.mock.calls.filter(([p]) => p === path);

const optionsOf = (queryClient: QueryClient, queryKey: unknown[]) =>
  queryClient.getQueryCache().find({ queryKey, exact: true })?.options as
    | { staleTime?: unknown; refetchOnWindowFocus?: unknown; retry?: unknown }
    | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  api.GET.mockImplementation(async (path: string) =>
    path === "/api/v1/integrations/pmspa" ? ok(connection()) : ok({ items: [] })
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe("PMSPA reads (feat-int-budget)", () => {
  it("AC-12 FR-INT-015: the PMSPA reads keep 5 minutes, don't refetch on focus and don't retry", async () => {
    const queryClient = createQueryClient();
    const expectPmspaRead = async (
      isFetched: () => boolean,
      key: unknown[]
    ) => {
      await waitFor(() => expect(isFetched()).toBe(true));
      expect(optionsOf(queryClient, key), key.join("/")).toEqual(
        expect.objectContaining({
          staleTime: 300000,
          refetchOnWindowFocus: false,
          retry: false
        })
      );
    };

    const projects = setup(() => usePmspaProjects(true), queryClient);
    await expectPmspaRead(
      () => projects.result.current.isFetched,
      [...REMOTE, "projects"]
    );
    const tasks = setup(() => usePmspaTasks("p1", true), queryClient);
    await expectPmspaRead(() => tasks.result.current.isFetched, tasksKey("p1"));
    const days = setup(
      () => usePmspaDays("2026-10-12", "2026-10-18", true),
      queryClient
    );
    await expectPmspaRead(
      () => days.result.current.isFetched,
      [...REMOTE, "days", "2026-10-12", "2026-10-18"]
    );
    const oneDay = setup(() => usePmspaDay("2026-10-16", true), queryClient);
    await expectPmspaRead(
      () => oneDay.result.current.isFetched,
      dayKey("2026-10-16")
    );
  });

  it("AC-13 FR-INT-015: Expand all is one request per tab and fills the row queries; an import preview's days fill the Time rows", async () => {
    const all = [task("a", "p1"), task("b", "p1"), task("c", "p3")];
    api.GET.mockImplementation(async (path: string, init?: unknown) => {
      if (path === "/api/v1/integrations/pmspa/tasks")
        return ok({ items: all });
      if (path === "/api/v1/integrations/pmspa/days/details") {
        const { dates } = (init as { params: { query: { dates: string[] } } })
          .params.query;
        return ok({
          items: dates.filter((d) => d === "2026-10-17").map(day)
        });
      }
      return ok({ items: [] });
    });

    // feat-int-followups D6: per project would cost 1 + 1 reads, all tasks 1, so all tasks are read.
    const sizes = { p1: 2, p2: 0, p3: 1 };
    const expand = {
      shown: [
        { id: "p1", taskCount: sizes.p1 },
        { id: "p2", taskCount: sizes.p2 }
      ],
      all: Object.entries(sizes).map(([id, taskCount]) => ({ id, taskCount }))
    };
    const tasks = setup(() => useLoadAllPmspaTasks());
    await act(() => tasks.result.current.mutateAsync(expand));
    expect(pathCalls(api.GET, "/api/v1/integrations/pmspa/tasks")).toHaveLength(
      1
    );
    expect(tasks.queryClient.getQueryData(tasksKey("p1"))).toEqual([
      all[0],
      all[1]
    ]);
    expect(tasks.queryClient.getQueryData(tasksKey("p2"))).toEqual([]);
    expect(tasks.queryClient.getQueryData(tasksKey("p3"))).toEqual([all[2]]);
    await act(() => tasks.result.current.mutateAsync(expand));
    expect(pathCalls(api.GET, "/api/v1/integrations/pmspa/tasks")).toHaveLength(
      1
    );

    const queryClient = createQueryClient();
    queryClient.setQueryData(dayKey("2026-10-16"), day("2026-10-16"));
    const days = setup(() => useLoadPmspaDays(), queryClient);
    await act(() =>
      days.result.current.mutateAsync(["2026-10-16", "2026-10-17"])
    );
    const details = () =>
      pathCalls(api.GET, "/api/v1/integrations/pmspa/days/details");
    expect(details()).toHaveLength(1);
    expect(details()[0][1]).toEqual(
      expect.objectContaining({
        params: { query: { dates: ["2026-10-17"] } }
      })
    );
    expect(queryClient.getQueryData(dayKey("2026-10-17"))).toEqual(
      day("2026-10-17")
    );
    await act(() => days.result.current.mutateAsync(["2026-10-18"]));
    expect(details()).toHaveLength(2);
    expect(queryClient.getQueryData(dayKey("2026-10-18"))).toBeNull();
    await act(() =>
      days.result.current.mutateAsync([
        "2026-10-16",
        "2026-10-17",
        "2026-10-18"
      ])
    );
    expect(details()).toHaveLength(2);

    api.POST.mockResolvedValue(
      ok({ items: [], days: [day("2026-10-15")] } satisfies S["SyncPreviewDto"])
    );
    const preview = setup(() => useImportPreview());
    await act(() =>
      preview.result.current.mutateAsync({
        projects: [],
        dates: ["2026-10-15"]
      })
    );
    expect(preview.queryClient.getQueryData(dayKey("2026-10-15"))).toEqual(
      day("2026-10-15")
    );
  });

  it("AC-24 FR-INT-015: usePmspaCandidates reads once a dropdown asks, one read per list and set of records", async () => {
    api.POST.mockResolvedValue(ok({ items: [] }));
    const queryClient = createQueryClient();

    const idle = setup(() => usePmspaCandidates(null), queryClient);
    await waitFor(() => expect(idle.result.current.fetchStatus).toBe("idle"));
    expect(api.POST).not.toHaveBeenCalled();

    const input: S["PmspaCandidatesInputDto"] = {
      type: "task",
      projectId: "x",
      for: ["b", "a"]
    };
    const read = setup(() => usePmspaCandidates(input), queryClient);
    await waitFor(() => expect(read.result.current.isSuccess).toBe(true));
    expect(api.POST).toHaveBeenCalledTimes(1);
    expect(api.POST).toHaveBeenCalledWith(
      "/api/v1/integrations/pmspa/candidates",
      expect.objectContaining({ body: input })
    );
    const key = [...REMOTE, "candidates", "task", "x", ["a", "b"]];
    expect(optionsOf(queryClient, key)).toEqual(
      expect.objectContaining({ staleTime: 300000, retry: false })
    );

    const again = setup(
      () =>
        usePmspaCandidates({ type: "task", projectId: "x", for: ["a", "b"] }),
      queryClient
    );
    await waitFor(() => expect(again.result.current.isSuccess).toBe(true));
    expect(api.POST).toHaveBeenCalledTimes(1);
  });
});

describe("PmspaRateLimit and ProfileIntegrations (feat-int-budget)", () => {
  /** Noon in Zagreb. */
  const NOW = new Date("2026-10-17T10:00:00.000Z");
  const inMinutes = (m: number) =>
    new Date(NOW.getTime() + m * 60_000).toISOString();
  const limit = (
    remaining: number,
    resetAt: string
  ): S["PmspaRateLimitDto"] => ({
    limit: 100,
    remaining,
    resetAt,
    observedAt: NOW.toISOString()
  });

  const renderLine = (rateLimit: S["PmspaRateLimitDto"] | null) =>
    render(
      <PmspaRateLimit
        connection={connection({ rateLimit })}
        tz="Europe/Zagreb"
      />,
      { wrapper: wrapperFor(createQueryClient()) }
    );

  it("AC-14 FR-INT-015: the requests line: all available, used of the limit with the reset, limit reached; the connection is read again after a PMSPA read", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: NOW });

    const lineOf = (rateLimit: S["PmspaRateLimitDto"] | null) => {
      const { container, unmount } = renderLine(rateLimit);
      const text = container.textContent;
      unmount();
      return text;
    };
    expect(lineOf(null)).toBe("All available");
    expect(lineOf(limit(63, inMinutes(9)))).toContain(
      "37 of 100 used, resets at 12:09 (in 9 min)"
    );
    expect(lineOf(limit(0, inMinutes(9)))).toContain(
      "Limit reached, PMSPA calls resume at 12:09"
    );
    expect(lineOf(limit(10, inMinutes(-1)))).toBe("All 100 available");

    const queryClient = createQueryClient();
    function Line() {
      const { data } = usePmspaConnection();
      return data ? (
        <PmspaRateLimit connection={data} tz="Europe/Zagreb" />
      ) : null;
    }
    render(<Line />, { wrapper: wrapperFor(queryClient) });
    const connectionReads = () =>
      pathCalls(api.GET, "/api/v1/integrations/pmspa");
    await waitFor(() => expect(connectionReads()).toHaveLength(1));
    expect(queryClient.getQueryData(CONNECTION_KEY)).toBeDefined();

    let answer: (value: unknown) => void = () => {};
    const pending = new Promise((resolve) => {
      answer = resolve;
    });
    let read: Promise<unknown> = Promise.resolve();
    act(() => {
      read = queryClient.fetchQuery({
        queryKey: [...REMOTE, "projects"],
        queryFn: () => pending
      });
    });
    // TanStack Query notifies observers on a setTimeout(0), not a microtask.
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(connectionReads()).toHaveLength(1);
    await act(async () => {
      answer([]);
      await read;
    });
    await waitFor(() => expect(connectionReads()).toHaveLength(2));
  });

  it("AC-15 FR-INT-016: Profile → Integrations shows the connected PMSPA account, or how to connect one", async () => {
    api.GET.mockResolvedValue(
      ok(
        connection({
          status: "not-configured",
          url: null,
          email: null,
          account: null,
          lastCheckedAt: null
        })
      )
    );
    const { unmount } = render(<ProfileIntegrations />, {
      wrapper: wrapperFor(createQueryClient())
    });
    expect(
      await screen.findByText("No PMSPA account connected.")
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link").map((a) => a.getAttribute("href"))
    ).toContain("/app/settings?tab=integrations");
    unmount();

    api.GET.mockResolvedValue(ok(connection()));
    render(<ProfileIntegrations />, {
      wrapper: wrapperFor(createQueryClient())
    });
    expect(await screen.findByText("pmspa-me@example.com")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(
      screen.queryByText("No PMSPA account connected.")
    ).not.toBeInTheDocument();
  });
});

describe("SyncPreviewDialog: lazy Link to existing (feat-int-budget)", () => {
  type Props = ComponentProps<typeof SyncPreviewDialog>;

  const row = (
    over: Partial<S["SyncPreviewItemDto"]> &
      Pick<S["SyncPreviewItemDto"], "key" | "type" | "title">
  ): S["SyncPreviewItemDto"] => ({
    parentKey: null,
    detail: null,
    action: "create",
    direction: "to-pmspa",
    reason: null,
    linkedId: null,
    parent: false,
    optional: false,
    candidates: null,
    differences: [],
    warnings: [],
    ...over
  });

  const items = [
    row({ key: "project:p", type: "project", title: "Platform" }),
    row({
      key: "task:t1",
      type: "task",
      title: "API",
      parentKey: "project:p",
      optional: true
    }),
    row({
      key: "task:t2",
      type: "task",
      title: "Web",
      parentKey: "project:p",
      optional: true
    })
  ];

  const candidate = (
    id: string,
    title: string,
    groupId: string | null = null
  ): S["SyncCandidateDto"] => ({
    id,
    title,
    groupId,
    detail: null,
    differences: []
  });

  function renderDialog(list: S["SyncPreviewItemDto"][]) {
    const props: Props = {
      open: true,
      onOpenChange: vi.fn(),
      mode: "sync",
      title: "Sync Platform with PMSPA",
      description: "Both ways.",
      items: list,
      isPending: false,
      isError: false,
      error: null,
      onRetry: vi.fn(),
      onRun: vi.fn()
    };
    render(<SyncPreviewDialog {...props} />, {
      wrapper: wrapperFor(createQueryClient())
    });
  }

  /** Opens a row's Link to existing ▾ (jsdom doesn't open it on click). */
  const open = (title: string) => {
    const input = screen.getByRole("combobox", { name: `${title} in PMSPA` });
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown" });
  };
  const close = (title: string) =>
    fireEvent.keyDown(
      screen.getByRole("combobox", { name: `${title} in PMSPA` }),
      { key: "Escape" }
    );
  const bodies = () =>
    api.POST.mock.calls
      .filter(([p]) => p === "/api/v1/integrations/pmspa/candidates")
      .map(([, init]) => (init as { body: unknown }).body);

  it("AC-25 FR-INT-008 SCR-061: Link to existing reads its PMSPA list when it opens; a task's follows its project's pick", async () => {
    let answer: (value: unknown) => void = () => {};
    api.POST.mockImplementation(async (_path: string, init: unknown) => {
      const body = (init as { body: S["PmspaCandidatesInputDto"] }).body;
      if (body.type === "project") {
        return new Promise((resolve) => {
          answer = resolve;
        });
      }
      return ok({
        items: [
          { pm4Id: "t1", candidates: [candidate("x1", "api", "x")] },
          { pm4Id: "t2", candidates: [] }
        ]
      });
    });
    renderDialog(items);
    expect(bodies()).toEqual([]);

    open("Platform");
    await waitFor(() =>
      expect(bodies()).toEqual([{ type: "project", for: ["p"] }])
    );
    expect(
      await screen.findByLabelText("Reading PMSPA projects")
    ).toBeInTheDocument();
    await act(async () => {
      answer(
        ok({
          items: [{ pm4Id: "p", candidates: [candidate("x", "Platform")] }]
        })
      );
    });
    expect(
      await screen.findByRole("option", { name: "Platform" })
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Reading PMSPA projects")
    ).not.toBeInTheDocument();
    close("Platform");

    open("API");
    expect(
      screen.getAllByText("No existing task to link to.").length
    ).toBeGreaterThan(0);
    expect(bodies()).toHaveLength(1);
    close("API");

    open("Platform");
    fireEvent.click(await screen.findByRole("option", { name: "Platform" }));

    open("API");
    await waitFor(() =>
      expect(bodies()).toEqual([
        { type: "project", for: ["p"] },
        { type: "task", projectId: "x", for: ["t1", "t2"] }
      ])
    );
    expect(
      await screen.findByRole("option", { name: "api" })
    ).toBeInTheDocument();
    close("API");

    open("Web");
    expect(bodies()).toHaveLength(2);
  });

  it("AC-25 FR-INT-008 SCR-061: a failed read shows the error with Retry, which reads again; a row with candidates reads nothing", async () => {
    api.POST.mockResolvedValue(
      failed(503, "pmspa-rate-limited", { retryAfterSeconds: 600 })
    );
    renderDialog(items.slice(0, 1));
    open("Platform");
    expect(
      await screen.findByText("PMSPA is busy. Try again in 10 minutes.")
    ).toBeInTheDocument();
    expect(bodies()).toHaveLength(1);
    api.POST.mockResolvedValue(
      ok({ items: [{ pm4Id: "p", candidates: [candidate("x", "Platform")] }] })
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(bodies()).toHaveLength(2));
    expect(
      await screen.findByRole("option", { name: "Platform" })
    ).toBeInTheDocument();
    cleanup();

    api.POST.mockClear();
    renderDialog([
      row({
        key: "project:q",
        type: "project",
        title: "Website",
        candidates: [candidate("y", "Website")]
      })
    ]);
    open("Website");
    expect(
      await screen.findByRole("option", { name: "Website" })
    ).toBeInTheDocument();
    expect(bodies()).toEqual([]);
  });
});
