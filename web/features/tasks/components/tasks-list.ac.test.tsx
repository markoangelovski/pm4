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
import type { Project } from "@/features/projects/api";
import type { Task, TaskList } from "@/features/tasks/api";
import { TasksList } from "./tasks-list";

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

const nav = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  search: new URLSearchParams()
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace }),
  usePathname: () => "/app/tasks",
  useSearchParams: () => nav.search
}));

// A plain anchor keeps the exact href (next.config isn't loaded in Vitest).
vi.mock("next/link", () => ({
  default: ({ href, ...props }: { href: string } & ComponentProps<"a">) => (
    <a href={href} {...props} />
  )
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() })
}));

const me: Me = {
  id: "0b6c7d2e-1f3a-4c5b-9d8e-7f6a5b4c3d2e",
  email: "marko@example.com",
  displayName: "Marko Angelovski",
  avatarUrl: null,
  timeZone: "Europe/Zagreb",
  createdAt: "2026-10-02T22:30:00.000Z"
};

const project = (id: string, title: string): Project => ({
  id,
  title,
  description: null,
  externalLink: null,
  projectLead: null,
  taskCounts: { upcoming: 0, inProgress: 0, completed: 0, total: 0 },
  createdAt: "2026-09-01T08:00:00.000Z",
  updatedAt: "2026-09-01T08:00:00.000Z"
});
const projects = [project("p2", "Mobile app"), project("p1", "Website")];

const website = { id: "p1", title: "Website" };

const task = (over: Partial<Task>): Task => ({
  id: "t1",
  project: { id: "p1", title: "Website", deleted: false },
  title: "Write the docs",
  description: null,
  externalLink: null,
  projectLead: null,
  status: "upcoming",
  dueDate: null,
  createdAt: "2026-09-20T08:00:00.000Z",
  updatedAt: "2026-09-28T08:00:00.000Z",
  ...over
});

// "Today" is 2026-10-03 in Zagreb: t1 is overdue, t2 is due soon.
const t1 = task({
  dueDate: "2026-10-02",
  projectLead: {
    kind: "user",
    user: { id: me.id, displayName: me.displayName, avatarUrl: null },
    name: me.displayName
  }
});
const t2 = task({
  id: "t2",
  title: "Ship it",
  status: "in-progress",
  dueDate: "2026-10-04"
});

const page = (items: Task[], total = items.length): TaskList => ({
  items,
  total,
  page: 1,
  pageSize: 25
});

const res = (status: number) => new Response(null, { status });

/** GET router: /me → me; /tasks → `listResult` (a function of the query); /projects → the picker's projects. */
let listResult: (query: Record<string, unknown>) => unknown;
function routeGet() {
  api.GET.mockImplementation(
    async (
      path: string,
      init?: { params?: { query?: Record<string, unknown> } }
    ) => {
      if (path === "/api/v1/me") return { data: me, response: res(200) };
      if (path === "/api/v1/tasks")
        return listResult(init?.params?.query ?? {});
      if (path === "/api/v1/projects") {
        return {
          data: { items: projects, total: 2, page: 1, pageSize: 100 },
          response: res(200)
        };
      }
      if (path === "/api/v1/users") {
        return { data: { items: [] }, response: res(200) };
      }
      throw new Error(`unexpected GET ${path}`);
    }
  );
}
const listQueries = () =>
  api.GET.mock.calls
    .filter(([path]) => path === "/api/v1/tasks")
    .map(
      ([, init]) =>
        (init as { params: { query: Record<string, unknown> } }).params.query
    );

/** Base UI's select acts on the pointer sequence, not on a bare click. */
function pick(option: HTMLElement) {
  fireEvent.pointerDown(option);
  fireEvent.mouseDown(option);
  fireEvent.pointerUp(option);
  fireEvent.mouseUp(option);
  fireEvent.click(option);
}

/** Types into a combobox, then opens its list (jsdom doesn't open it on input). */
function type(input: HTMLElement, text: string) {
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: "ArrowDown" });
}

function renderList(props: ComponentProps<typeof TasksList> = {}, search = "") {
  nav.search = new URLSearchParams(search);
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
  return { onUrlUpdate, ...render(<TasksList {...props} />, { wrapper }) };
}

const statusFilter = () =>
  within(screen.getByRole("group", { name: "Filter by status" }));

describe("TasksList (feat-tsk-web)", () => {
  beforeEach(() => {
    // Only Date is faked (for "today"); timers stay real.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-03T10:00:00.000Z"));
    Object.values(api).forEach((fn) => fn.mockReset());
    nav.push.mockReset();
    routeGet();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC-8 FR-TSK-002 FR-TSK-008 SCR-021: a project's tasks: request, row cells, row click, New task with the project", async () => {
    listResult = () => ({ data: page([t1, t2]), response: res(200) });
    renderList({ project: website });

    const link = await screen.findByRole("link", { name: "Write the docs" });
    expect(listQueries()[0]).toEqual({
      projectId: "p1",
      sort: "updatedAt:desc",
      page: 1,
      pageSize: 25
    });
    expect(link).toHaveAttribute("href", "/app/task?id=t1");
    expect(
      screen.queryByRole("columnheader", { name: "Project" })
    ).not.toBeInTheDocument();

    const row = link.closest("tr")!;
    expect(
      within(row).getByRole("combobox", { name: "Status of Write the docs" })
    ).toHaveTextContent("Upcoming");
    expect(within(row).getByText("2 Oct 2026")).toBeInTheDocument();
    expect(within(row).getByText("Overdue")).toBeInTheDocument();
    expect(within(row).getByText("Marko Angelovski")).toBeInTheDocument();
    expect(within(row).getByText("20 Sep 2026")).toBeInTheDocument();
    expect(within(row).getByText("28 Sep 2026")).toBeInTheDocument();

    const row2 = screen.getByRole("link", { name: "Ship it" }).closest("tr")!;
    expect(within(row2).getByText("4 Oct 2026")).toBeInTheDocument();
    expect(within(row2).getByText("Due soon")).toBeInTheDocument();

    fireEvent.click(within(row).getByText("2 Oct 2026"));
    expect(nav.push).toHaveBeenCalledWith("/app/task?id=t1");

    fireEvent.click(screen.getAllByRole("button", { name: "New task" })[0]);
    expect(
      await screen.findByRole("heading", { name: "New task" })
    ).toBeInTheDocument();
    expect((screen.getByLabelText("Project") as HTMLInputElement).value).toBe(
      "Website"
    );
  });

  it("AC-9 FR-TSK-003 SCR-030: status toggles (page back to 1), none selected, debounced search, sort", async () => {
    listResult = () => ({ data: page([t1, t2], 30), response: res(200) });
    const view = renderList({ project: website }, "?page=2");
    await screen.findByRole("link", { name: "Write the docs" });
    expect(listQueries().at(-1)).toMatchObject({ page: 2 });

    fireEvent.click(statusFilter().getByRole("button", { name: "Completed" }));
    await waitFor(() =>
      expect(listQueries().at(-1)).toEqual({
        projectId: "p1",
        status: ["upcoming", "in-progress"],
        sort: "updatedAt:desc",
        page: 1,
        pageSize: 25
      })
    );

    fireEvent.click(statusFilter().getByRole("button", { name: "Upcoming" }));
    await waitFor(() =>
      expect(listQueries().at(-1)).toMatchObject({ status: ["in-progress"] })
    );
    const before = listQueries().length;
    fireEvent.click(
      statusFilter().getByRole("button", { name: "In progress" })
    );
    expect(
      await screen.findByText("No tasks match the filter")
    ).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(listQueries()).toHaveLength(before);
    view.unmount();

    renderList({ project: website });
    await screen.findByRole("link", { name: "Write the docs" });
    fireEvent.change(screen.getByRole("searchbox", { name: "Search tasks" }), {
      target: { value: "api" }
    });
    await waitFor(() =>
      expect(listQueries().filter((q) => q.q === "api")).toHaveLength(1)
    );
    expect(listQueries().find((q) => q.q === "api")).toEqual({
      projectId: "p1",
      q: "api",
      sort: "updatedAt:desc",
      page: 1,
      pageSize: 25
    });

    fireEvent.click(screen.getByRole("combobox", { name: "Sort" }));
    pick(await screen.findByRole("option", { name: "Due date" }));
    await waitFor(() =>
      expect(listQueries().at(-1)).toMatchObject({
        q: "api",
        sort: "dueDate:asc",
        page: 1
      })
    );
  });

  it("AC-10 FR-TSK-002 SCR-030: no tasks yet, no match with a search, error with Retry", async () => {
    listResult = () => ({ data: page([]), response: res(200) });
    const empty = renderList();
    expect(await screen.findByText("No tasks yet")).toBeInTheDocument();
    expect(
      screen.getByText("Create a task to start tracking your work.")
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "New task" })).toHaveLength(2);
    empty.unmount();

    const noMatch = renderList({}, "?q=zzz");
    expect(
      await screen.findByText("No tasks match the filter")
    ).toBeInTheDocument();
    expect(screen.queryByText("No tasks yet")).not.toBeInTheDocument();
    noMatch.unmount();

    listResult = () => ({ error: "Internal Server Error", response: res(500) });
    renderList();
    expect(
      await screen.findByText("Couldn't load tasks.", undefined, {
        timeout: 4000
      })
    ).toBeInTheDocument();
    const before = listQueries().length;
    listResult = () => ({ data: page([t1]), response: res(200) });
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(listQueries().length).toBeGreaterThan(before));
    expect(
      await screen.findByRole("link", { name: "Write the docs" })
    ).toBeInTheDocument();
  });

  it("AC-11 FR-TSK-003 SCR-030: all tasks: Project column and links; the project filter sets ?project= and projectId", async () => {
    listResult = (query) => ({
      data: page(query.projectId === "p2" ? [] : [t1]),
      response: res(200)
    });
    const { onUrlUpdate } = renderList();

    const link = await screen.findByRole("link", { name: "Write the docs" });
    expect(
      screen.getByRole("columnheader", { name: "Project" })
    ).toBeInTheDocument();
    expect(
      within(link.closest("tr")!).getByRole("link", { name: "Website" })
    ).toHaveAttribute("href", "/app/project?id=p1");
    expect(listQueries()[0]).not.toHaveProperty("projectId");

    const filter = screen.getByDisplayValue("All projects");
    type(filter, "Mob");
    fireEvent.click(await screen.findByRole("option", { name: "Mobile app" }));
    await waitFor(() =>
      expect(listQueries().at(-1)).toMatchObject({ projectId: "p2", page: 1 })
    );
    await waitFor(() =>
      expect(
        onUrlUpdate.mock.calls.at(-1)?.[0].searchParams.get("project")
      ).toBe("p2")
    );

    // Nothing in Mobile app: an active project filter counts as filtered.
    expect(
      await screen.findByText("No tasks match the filter")
    ).toBeInTheDocument();

    // "All projects" → no projectId; the unfiltered list is still cached, so it shows again.
    type(screen.getByDisplayValue("Mobile app"), "");
    fireEvent.click(
      await screen.findByRole("option", { name: "All projects" })
    );
    await waitFor(() =>
      expect(
        onUrlUpdate.mock.calls.at(-1)?.[0].searchParams.has("project")
      ).toBe(false)
    );
    expect(
      await screen.findByRole("link", { name: "Write the docs" })
    ).toBeInTheDocument();
    expect(
      listQueries().every((q) => !("projectId" in q) || q.projectId === "p2")
    ).toBe(true);
  });

  it("AC-12 FR-TSK-006: an inline status change → PATCH; the row stays in a list filtered to the old status", async () => {
    listResult = () => ({ data: page([t1]), response: res(200) });
    api.PATCH.mockResolvedValueOnce({
      data: {
        ...t1,
        status: "completed",
        updatedAt: "2026-10-03T10:00:00.000Z"
      },
      response: res(200)
    });
    renderList({ project: website }, "?status=upcoming");
    await screen.findByRole("link", { name: "Write the docs" });
    expect(listQueries().at(-1)).toMatchObject({ status: ["upcoming"] });
    const gets = listQueries().length;

    fireEvent.click(
      screen.getByRole("combobox", { name: "Status of Write the docs" })
    );
    pick(await screen.findByRole("option", { name: "Completed" }));

    await waitFor(() =>
      expect(api.PATCH).toHaveBeenCalledWith(
        "/api/v1/tasks/{id}",
        expect.objectContaining({
          params: { path: { id: "t1" } },
          body: { status: "completed" }
        })
      )
    );
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: "Status of Write the docs" })
      ).toHaveTextContent("Completed")
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(
      screen.getByRole("link", { name: "Write the docs" })
    ).toBeInTheDocument();
    expect(listQueries()).toHaveLength(gets);
  });
});
