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
  createdAt: "2026-10-02T22:30:00.000Z"
};

const website: Project = {
  id: "p1",
  title: "Website",
  description: null,
  externalLink: null,
  projectLead: { kind: "text", user: null, name: "Bob Builder" },
  taskCounts: { upcoming: 2, inProgress: 1, completed: 1, total: 4 },
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

/** GET router: /me → me; /projects → `listResult` (a function of the query). */
let listResult: (query: Record<string, unknown>) => unknown;
function routeGet() {
  api.GET.mockImplementation(
    async (
      path: string,
      init?: { params?: { query?: Record<string, unknown> } }
    ) => {
      if (path === "/api/v1/me") return { data: me, response: res(200) };
      if (path === "/api/v1/projects")
        return listResult(init?.params?.query ?? {});
      throw new Error(`unexpected GET ${path}`);
    }
  );
}
const listQueries = () =>
  api.GET.mock.calls
    .filter(([path]) => path === "/api/v1/projects")
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

  it("AC-11 FR-PRJ-002 SCR-020: rows, row click, empty, no match and error states", async () => {
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

    fireEvent.click(within(row).getByText("Bob Builder"));
    expect(nav.push).toHaveBeenCalledWith("/app/project?id=p1");
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
