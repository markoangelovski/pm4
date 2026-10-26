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
  waitFor,
  within
} from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { createQueryClient } from "@/lib/query-client";
import type { components } from "@/lib/api/schema";
import type { Me } from "@/features/users/api";
import type { Task, TaskList } from "@/features/tasks/api";
import { TasksList } from "@/features/tasks/components/tasks-list";
import { useLoadAllPmspaTasks } from "./api";
import { PmspaCreatedStamp } from "./components/pmspa-created-stamp";
import { PmspaProjectsTab } from "./components/pmspa-projects-tab";
import { PmspaRecordNote } from "./components/pmspa-record-note";

type S = components["schemas"];

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  PUT: vi.fn(),
  POST: vi.fn(),
  PATCH: vi.fn(),
  DELETE: vi.fn()
}));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

const nav = vi.hoisted(() => ({ search: new URLSearchParams() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/app/tasks",
  useSearchParams: () => nav.search
}));

// next/link applies its own href normalization outside a Next build. A plain anchor keeps the exact href.
vi.mock("next/link", () => ({
  default: ({ href, ...props }: { href: string } & ComponentProps<"a">) => (
    <a href={href} {...props} />
  )
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() })
}));

const REMOTE = ["integrations", "pmspa", "remote"];
const tasksKey = (projectId: string) => [...REMOTE, "tasks", projectId];
const ALL_TASKS = "/api/v1/integrations/pmspa/tasks";
const PROJECT_TASKS = "/api/v1/integrations/pmspa/projects/{id}/tasks";

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

const me: Me = {
  id: "0b6c7d2e-1f3a-4c5b-9d8e-7f6a5b4c3d2e",
  email: "marko@example.com",
  displayName: "Marko Angelovski",
  avatarUrl: null,
  timeZone: "Europe/Zagreb",
  dailyTargetMinutes: 420,
  createdAt: "2026-10-02T22:30:00.000Z"
};

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
const NOT_CONFIGURED = connection({
  status: "not-configured",
  url: null,
  email: null,
  account: null,
  lastCheckedAt: null
});

const CREATED_AT = "2023-10-06T12:38:08.000Z";
/** The task links: t1 linked (created in PMSPA at `CREATED_AT`), t2 not. */
const taskLink: S["PmspaLinkDto"] = {
  pm4Id: "t1",
  origin: "imported",
  syncedAt: "2026-10-15T20:50:00.000Z",
  pmspaCreatedAt: CREATED_AT
};

const pmspaTask = (id: string, projectId: string): S["PmspaTaskDto"] => ({
  id,
  projectId,
  title: `Task ${id}`,
  column: "In Progress",
  link: null
});

const task = (over: Partial<Task>): Task => ({
  id: "t1",
  project: { id: "p1", title: "Website", deleted: false },
  service: null,
  title: "Write the docs",
  description: null,
  externalLink: null,
  projectLead: null,
  status: "upcoming",
  dueDate: null,
  loggedMinutes: 0,
  createdAt: "2026-09-20T08:00:00.000Z",
  updatedAt: "2026-09-28T08:00:00.000Z",
  ...over
});
const taskPage: TaskList = {
  items: [task({}), task({ id: "t2", title: "Ship it" })],
  total: 2,
  page: 1,
  pageSize: 25
};

/** GET router: the connection, me, the task links and their detail, PM4's tasks and projects. */
function routeGet(conn: S["PmspaConnectionResponseDto"] = connection()) {
  api.GET.mockImplementation(async (path: string) => {
    if (path === "/api/v1/integrations/pmspa") return ok(conn);
    if (path === "/api/v1/me") return ok(me);
    if (path === "/api/v1/integrations/pmspa/links")
      return ok({ items: [taskLink] });
    if (path === "/api/v1/integrations/pmspa/links/{type}/{id}")
      return ok({
        origin: "imported",
        syncedAt: taskLink.syncedAt,
        pmspa: {
          type: "task",
          title: "Write docs",
          projectTitle: "Website",
          column: "Upcoming"
        }
      });
    if (path === "/api/v1/tasks") return ok(taskPage);
    if (path === "/api/v1/projects")
      return ok({ items: [], total: 0, page: 1, pageSize: 100 });
    if (path === "/api/v1/users") return ok({ items: [] });
    return ok({ items: [] });
  });
}

function wrapperFor(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NuqsTestingAdapter hasMemory>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </NuqsTestingAdapter>
    );
  };
}

function renderWith(ui: ReactNode, queryClient = createQueryClient()) {
  return render(ui, { wrapper: wrapperFor(queryClient) });
}

const pathCalls = (path: string) =>
  api.GET.mock.calls.filter(([p]) => p === path);
const projectTaskReads = () =>
  pathCalls(PROJECT_TASKS).map(
    ([, init]) => (init as { params: { path: { id: string } } }).params.path.id
  );

beforeEach(() => {
  vi.clearAllMocks();
  nav.search = new URLSearchParams();
  routeGet();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("PMSPA follow-ups (feat-int-followups)", () => {
  it("AC-6 FR-INT-015 SCR-060: Expand all reads per project only when strictly cheaper, all tasks on a tie, nothing when every shown list is fresh", async () => {
    const all = [
      pmspaTask("a", "p1"),
      pmspaTask("b", "p2"),
      pmspaTask("c", "p3")
    ];
    api.GET.mockImplementation(async (path: string, init?: unknown) => {
      if (path === ALL_TASKS) return ok({ items: all });
      if (path === PROJECT_TASKS) {
        const { id } = (init as { params: { path: { id: string } } }).params
          .path;
        return ok({ items: all.filter((t) => t.projectId === id) });
      }
      return ok({ items: [] });
    });
    const size = (id: string, taskCount: number) => ({ id, taskCount });
    const p1 = size("p1", 60);
    const p2 = size("p2", 100);
    const p3 = size("p3", 40);
    // 200 tasks: all tasks costs 4 reads.
    const sizes = [p1, p2, p3];
    const expand = () => {
      const queryClient = createQueryClient();
      const hook = renderHook(() => useLoadAllPmspaTasks(), {
        wrapper: wrapperFor(queryClient)
      });
      return { queryClient, mutate: hook.result.current.mutateAsync };
    };

    // p1 alone: 2 < 4.
    let run = expand();
    await act(() => run.mutate({ shown: [p1], all: sizes }));
    expect(projectTaskReads()).toEqual(["p1"]);
    expect(pathCalls(ALL_TASKS)).toHaveLength(0);
    expect(run.queryClient.getQueryData(tasksKey("p1"))).toEqual([all[0]]);

    // p1 and p2: 2 + 2 = 4, a tie: all tasks, and every project's list.
    api.GET.mockClear();
    run = expand();
    await act(() => run.mutate({ shown: [p1, p2], all: sizes }));
    expect(pathCalls(ALL_TASKS)).toHaveLength(1);
    expect(projectTaskReads()).toEqual([]);
    expect(run.queryClient.getQueryData(tasksKey("p3"))).toEqual([all[2]]);

    // p1 cached and fresh: only p2 counts, 2 < 4.
    api.GET.mockClear();
    run = expand();
    run.queryClient.setQueryData(tasksKey("p1"), [all[0]]);
    await act(() => run.mutate({ shown: [p1, p2], all: sizes }));
    expect(projectTaskReads()).toEqual(["p2"]);
    expect(pathCalls(ALL_TASKS)).toHaveLength(0);

    // Every shown list fresh: nothing is read.
    api.GET.mockClear();
    await act(() => run.mutate({ shown: [p1, p2], all: sizes }));
    expect(api.GET).not.toHaveBeenCalled();

    // A project with 0 tasks counts 1: p3 1 + p4 1 = 2 ties all tasks' ⌈100/50⌉ = 2.
    api.GET.mockClear();
    const p4 = size("p4", 0);
    run = expand();
    await act(() => run.mutate({ shown: [p3, p4], all: [p1, p3, p4] }));
    expect(pathCalls(ALL_TASKS)).toHaveLength(1);
    expect(projectTaskReads()).toEqual([]);
    expect(run.queryClient.getQueryData(tasksKey("p4"))).toEqual([]);
  });

  it("AC-7 FR-INT-014 SCR-060: an opened project's task read error uses the PMSPA problem line, else Couldn't read the tasks., with Retry", async () => {
    const website: S["PmspaProjectDto"] = {
      id: "p1",
      title: "Website",
      done: false,
      taskCount: 3,
      link: null
    };
    const renderTab = (tasksAnswer: unknown) => {
      api.GET.mockImplementation(async (path: string) => {
        if (path === "/api/v1/integrations/pmspa/projects")
          return ok({ items: [website] });
        if (path === PROJECT_TASKS) return tasksAnswer;
        return ok({ items: [] });
      });
      renderWith(
        <PmspaProjectsTab selection={new Map()} onSelectionChange={vi.fn()} />
      );
    };

    renderTab(failed(503, "pmspa-rate-limited", { retryAfterSeconds: 600 }));
    fireEvent.click(await screen.findByText("Website"));
    expect(
      await screen.findByText("PMSPA is busy. Try again in 10 minutes.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(
      screen.queryByText(/Couldn't read the tasks/)
    ).not.toBeInTheDocument();
    cleanup();

    renderTab(failed(500, "internal"));
    fireEvent.click(await screen.findByText("Website"));
    expect(
      await screen.findByText("Couldn't read the tasks.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("AC-9 FR-INT-010 SCR-021 SCR-030 SCR-031 SCR-062: created in PMSPA on the task header, the task list column and the sync-flag popover", async () => {
    // Header stamp: linked → the date and time in the user's zone.
    const stamp = renderWith(
      <PmspaCreatedStamp type="task" id="t1" timeZone="Europe/Zagreb" />
    );
    await waitFor(() =>
      expect(stamp.container).toHaveTextContent(
        "Created in PMSPA 6 October 2023, 14:38"
      )
    );
    cleanup();

    // Not linked → nothing.
    const unlinked = renderWith(
      <PmspaCreatedStamp type="task" id="t2" timeZone="Europe/Zagreb" />
    );
    await waitFor(() =>
      expect(pathCalls("/api/v1/integrations/pmspa/links")).not.toHaveLength(0)
    );
    await waitFor(() => expect(unlinked.container).toBeEmptyDOMElement());
    cleanup();

    // No connection → nothing.
    routeGet(NOT_CONFIGURED);
    const off = renderWith(
      <PmspaCreatedStamp type="task" id="t1" timeZone="Europe/Zagreb" />
    );
    await waitFor(() =>
      expect(pathCalls("/api/v1/integrations/pmspa")).not.toHaveLength(0)
    );
    expect(off.container).toBeEmptyDOMElement();
    cleanup();

    // Task list with a saved connection: the column, the date on t1, "—" on t2.
    routeGet();
    renderWith(<TasksList />);
    const header = await screen.findByRole("columnheader", {
      name: "Created in PMSPA"
    });
    const column = [...header.parentElement!.children].indexOf(header);
    const cellOf = (title: string) =>
      screen.getByRole("link", { name: title }).closest("tr")!.children[
        column
      ] as HTMLElement;
    await waitFor(() =>
      expect(cellOf("Write the docs")).toHaveTextContent("6 Oct 2023")
    );
    expect(within(cellOf("Ship it")).getByText("—")).toBeInTheDocument();
    cleanup();

    // Not configured → no such column.
    routeGet(NOT_CONFIGURED);
    renderWith(<TasksList />);
    await screen.findByRole("link", { name: "Ship it" });
    expect(
      screen.queryByRole("columnheader", { name: "Created in PMSPA" })
    ).not.toBeInTheDocument();
    cleanup();

    // The sync flag's popover: after the column.
    routeGet();
    renderWith(
      <Popover open>
        <PopoverContent>
          <PmspaRecordNote type="task" id="t1" />
        </PopoverContent>
      </Popover>
    );
    await waitFor(() =>
      expect(document.body).toHaveTextContent(
        ", Upcoming, created in PMSPA on 6 October 2023, 14:38"
      )
    );
  });
});
