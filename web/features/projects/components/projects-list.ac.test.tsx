import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps, ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { createQueryClient } from "@/lib/query-client";
import type { Me } from "@/features/users/api";
import type { Project, ProjectList } from "@/features/projects/api";
import type { Task, TaskList } from "@/features/tasks/api";
import { ProjectsList } from "./projects-list";

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

const nav = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  search: new URLSearchParams()
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace }),
  usePathname: () => "/app/projects",
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
  dailyTargetMinutes: 420,
  createdAt: "2026-10-02T22:30:00.000Z"
};

const website: Project = {
  id: "p1",
  title: "Website",
  description: null,
  externalLink: null,
  projectLead: { kind: "text", user: null, name: "Bob Builder" },
  taskCounts: { upcoming: 2, inProgress: 1, completed: 1, total: 4 },
  services: [],
  loggedMinutes: 0,
  createdAt: "2026-10-03T08:00:00.000Z",
  updatedAt: "2026-10-03T08:00:00.000Z"
};

const page = (items: Project[], total = items.length, n = 1): ProjectList => ({
  items,
  total,
  page: n,
  pageSize: 25
});

const res = (status: number) => new Response(null, { status });

/** GET router: /me → me; /projects → `listResult`, /tasks → `tasksResult` (functions of the query). */
let listResult: (query: Record<string, unknown>) => unknown;
let tasksResult: (query: Record<string, unknown>) => unknown = () => {
  throw new Error("unexpected GET /api/v1/tasks");
};
function routeGet() {
  api.GET.mockImplementation(
    async (
      path: string,
      init?: { params?: { query?: Record<string, unknown> } }
    ) => {
      if (path === "/api/v1/me") return { data: me, response: res(200) };
      if (path === "/api/v1/projects")
        return listResult(init?.params?.query ?? {});
      if (path === "/api/v1/tasks")
        return tasksResult(init?.params?.query ?? {});
      throw new Error(`unexpected GET ${path}`);
    }
  );
}
const queriesOf = (target: string) =>
  api.GET.mock.calls
    .filter(([path]) => path === target)
    .map(
      ([, init]) =>
        (init as { params: { query: Record<string, unknown> } }).params.query
    );
const listQueries = () => queriesOf("/api/v1/projects");
const taskQueries = () => queriesOf("/api/v1/tasks");

/** Base UI's select acts on the pointer sequence, not on a bare click. */
function pick(option: HTMLElement) {
  fireEvent.pointerDown(option);
  fireEvent.mouseDown(option);
  fireEvent.pointerUp(option);
  fireEvent.mouseUp(option);
  fireEvent.click(option);
}

function renderList(search = "") {
  nav.search = new URLSearchParams(search);
  const queryClient = createQueryClient();
  queryClient.setQueryData(["users", "me"], me);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <NuqsTestingAdapter searchParams={search} hasMemory>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </NuqsTestingAdapter>
  );
  return render(<ProjectsList />, { wrapper });
}

describe("ProjectsList (feat-prj-web)", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    nav.push.mockReset();
    nav.replace.mockReset();
    routeGet();
  });

  it("AC-11 FR-PRJ-002 SCR-020: rows, empty, no match and error states", async () => {
    listResult = () => ({ data: page([website]), response: res(200) });
    const view = renderList();

    const link = await screen.findByRole("link", { name: "Website" });
    expect(link).toHaveAttribute("href", "/app/project?id=p1");
    const row = link.closest("tr")!;
    expect(within(row).getByText("Bob Builder")).toBeInTheDocument();
    expect(within(row).getByTitle("Upcoming")).toHaveTextContent("2");
    expect(within(row).getByTitle("In progress")).toHaveTextContent("1");
    expect(within(row).getByTitle("Completed")).toHaveTextContent("1");
    expect(within(row).getByText("25 %")).toBeInTheDocument();
    view.unmount();

    listResult = () => ({ data: page([]), response: res(200) });
    const empty = renderList();
    expect(await screen.findByText("No projects yet")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "New project" })).toHaveLength(
      2
    );
    empty.unmount();

    const noMatch = renderList("?q=zzz");
    expect(
      await screen.findByText("No projects match your search")
    ).toBeInTheDocument();
    noMatch.unmount();

    listResult = () => ({ error: "Internal Server Error", response: res(500) });
    renderList();
    expect(
      await screen.findByText("Couldn't load projects.", undefined, {
        timeout: 4000
      })
    ).toBeInTheDocument();
    const before = listQueries().length;
    listResult = () => ({ data: page([website]), response: res(200) });
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(listQueries().length).toBeGreaterThan(before));
    expect(
      await screen.findByRole("link", { name: "Website" })
    ).toBeInTheDocument();
  });

  it("AC-12 FR-PRJ-002 SCR-020: debounced search and sort reset the page; pagination only above 25", async () => {
    listResult = (query) => ({
      data: page([website], 30, Number(query.page ?? 1)),
      response: res(200)
    });
    const view = renderList("?page=2");
    await screen.findByRole("link", { name: "Website" });
    expect(listQueries().at(-1)).toEqual({
      sort: "updatedAt:desc",
      page: 2,
      pageSize: 25
    });

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search projects" }),
      {
        target: { value: "web" }
      }
    );
    await waitFor(() =>
      expect(listQueries().filter((q) => q.q === "web")).toHaveLength(1)
    );
    expect(listQueries().find((q) => q.q === "web")).toEqual({
      q: "web",
      sort: "updatedAt:desc",
      page: 1,
      pageSize: 25
    });

    fireEvent.click(screen.getByRole("combobox", { name: "Sort" }));
    pick(await screen.findByRole("option", { name: "Title A–Z" }));
    await waitFor(() =>
      expect(listQueries().at(-1)).toEqual({
        q: "web",
        sort: "title:asc",
        page: 1,
        pageSize: 25
      })
    );

    fireEvent.click(await screen.findByRole("link", { name: /next/i }));
    await waitFor(() =>
      expect(listQueries().at(-1)).toMatchObject({ page: 2 })
    );
    view.unmount();

    listResult = () => ({ data: page([website], 10), response: res(200) });
    renderList();
    await screen.findByRole("link", { name: "Website" });
    expect(
      screen.queryByRole("link", { name: /next/i })
    ).not.toBeInTheDocument();
  });
});

/** The cell of `row` under the column header `name`. */
function cellUnder(row: HTMLElement, name: string) {
  const index = screen
    .getAllByRole("columnheader")
    .findIndex((h) => h.textContent === name);
  expect(index, name).toBeGreaterThanOrEqual(0);
  return within(row).getAllByRole("cell")[index];
}

describe("ProjectsList logged time (feat-proto-sync-web)", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    nav.push.mockReset();
    nav.replace.mockReset();
    routeGet();
  });

  it("AC-13 FR-PRJ-002 SCR-020: a Logged column with each project's logged time, — when nothing is logged", async () => {
    const mobile: Project = {
      ...website,
      id: "p2",
      title: "Mobile app",
      loggedMinutes: 0
    };
    listResult = () => ({
      data: page([{ ...website, loggedMinutes: 105 }, mobile]),
      response: res(200)
    });
    renderList();

    const logged = (
      await screen.findByRole("link", { name: "Website" })
    ).closest("tr")!;
    const none = screen
      .getByRole("link", { name: "Mobile app" })
      .closest("tr")!;
    expect(cellUnder(logged, "Logged")).toHaveTextContent("1h 45m");
    expect(cellUnder(none, "Logged")).toHaveTextContent("—");
  });
});

const task = (n: number, over: Partial<Task> = {}): Task => ({
  id: `t${n}`,
  title: `Task ${n}`,
  description: null,
  externalLink: null,
  projectLead: { kind: "text", user: null, name: `Lead ${n}` },
  status: "upcoming",
  dueDate: null,
  loggedMinutes: 0,
  project: { id: "p1", title: "Website", deleted: false },
  service: null,
  createdAt: "2026-10-04T08:00:00.000Z",
  updatedAt: "2026-10-04T08:00:00.000Z",
  ...over
});

const taskPage = (items: Task[], total = items.length): TaskList => ({
  items,
  total,
  page: 1,
  pageSize: 25
});

describe("ProjectsList task rows (feat-prj-task-rows)", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    nav.push.mockReset();
    nav.replace.mockReset();
    routeGet();
    listResult = () => ({ data: page([website]), response: res(200) });
    tasksResult = () => ({
      data: taskPage([
        task(1),
        task(2, { status: "in-progress", projectLead: null })
      ]),
      response: res(200)
    });
  });

  it("AC-1 FR-PRJ-002 SCR-020: the chevron reads the open tasks on first expand and toggles the task rows", async () => {
    renderList();
    await screen.findByRole("link", { name: "Website" });
    expect(taskQueries()).toHaveLength(0);

    const show = screen.getByRole("button", {
      name: "Show the tasks of Website"
    });
    expect(show).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(show);
    expect(
      await screen.findByRole("link", { name: "Task 1" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Task 2" })).toBeInTheDocument();
    expect(taskQueries()).toEqual([
      {
        projectId: "p1",
        status: ["upcoming", "in-progress"],
        sort: "updatedAt:desc",
        page: 1,
        pageSize: 25
      }
    ]);
    const hide = screen.getByRole("button", {
      name: "Hide the tasks of Website"
    });
    expect(hide).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(hide);
    expect(
      screen.queryByRole("link", { name: "Task 1" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Show the tasks of Website" })
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("AC-2 FR-PRJ-002 SCR-020: a click elsewhere on the row opens and closes it; the title still links to the project", async () => {
    renderList();
    const link = await screen.findByRole("link", { name: "Website" });
    expect(link).toHaveAttribute("href", "/app/project?id=p1");
    const row = link.closest("tr")!;

    fireEvent.click(within(row).getByText("Bob Builder"));
    expect(
      await screen.findByRole("link", { name: "Task 1" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Hide the tasks of Website" })
    ).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(within(row).getByText("Bob Builder"));
    expect(
      screen.queryByRole("link", { name: "Task 1" })
    ).not.toBeInTheDocument();
    expect(nav.push).not.toHaveBeenCalled();
  });

  it("AC-3 FR-PRJ-002 SCR-020: a task row shows the title link, the lead and the status as text", async () => {
    renderList();
    fireEvent.click(
      await screen.findByRole("button", { name: "Show the tasks of Website" })
    );

    const first = await screen.findByRole("link", { name: "Task 1" });
    expect(first).toHaveAttribute("href", "/app/task?id=t1");
    const row1 = first.closest("tr")!;
    expect(within(row1).getByText("Lead 1")).toBeInTheDocument();
    expect(within(row1).getByText("Upcoming")).toBeInTheDocument();
    expect(within(row1).queryByRole("combobox")).not.toBeInTheDocument();

    const second = screen.getByRole("link", { name: "Task 2" });
    expect(second).toHaveAttribute("href", "/app/task?id=t2");
    const row2 = second.closest("tr")!;
    expect(within(row2).getByText("In progress")).toBeInTheDocument();
    expect(within(row2).queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("AC-4 FR-PRJ-002 SCR-020: more than 25 open tasks → Show all N open tasks", async () => {
    const many = Array.from({ length: 25 }, (_, i) => task(i + 1));
    tasksResult = () => ({ data: taskPage(many, 30), response: res(200) });
    const view = renderList();
    fireEvent.click(
      await screen.findByRole("button", { name: "Show the tasks of Website" })
    );
    expect(
      await screen.findByRole("link", { name: "Show all 30 open tasks" })
    ).toHaveAttribute("href", "/app/project?id=p1&status=upcoming,in-progress");
    view.unmount();

    tasksResult = () => ({ data: taskPage(many), response: res(200) });
    renderList();
    fireEvent.click(
      await screen.findByRole("button", { name: "Show the tasks of Website" })
    );
    expect(
      await screen.findByRole("link", { name: "Task 25" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /^Show all/ })
    ).not.toBeInTheDocument();
  });

  it("AC-5 FR-PRJ-002 SCR-020: a project without open tasks doesn't open", async () => {
    listResult = () => ({
      data: page([
        {
          ...website,
          taskCounts: { upcoming: 0, inProgress: 0, completed: 3, total: 3 }
        }
      ]),
      response: res(200)
    });
    renderList();
    const row = (await screen.findByRole("link", { name: "Website" })).closest(
      "tr"
    )!;
    expect(
      screen.getByRole("button", { name: "Show the tasks of Website" })
    ).toBeDisabled();

    fireEvent.click(within(row).getByText("Bob Builder"));
    await new Promise((r) => setTimeout(r, 50));
    expect(taskQueries()).toHaveLength(0);
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });

  it("AC-6 FR-PRJ-002 SCR-020: a failed tasks request shows an error with Retry", async () => {
    tasksResult = () => ({
      error: "Internal Server Error",
      response: res(500)
    });
    renderList();
    fireEvent.click(
      await screen.findByRole("button", { name: "Show the tasks of Website" })
    );
    expect(
      await screen.findByText("Couldn't load the tasks.", undefined, {
        timeout: 4000
      })
    ).toBeInTheDocument();

    const before = taskQueries().length;
    tasksResult = () => ({ data: taskPage([task(1)]), response: res(200) });
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(
      await screen.findByRole("link", { name: "Task 1" })
    ).toBeInTheDocument();
    expect(taskQueries().length).toBeGreaterThan(before);
  });
});
