import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import type { Me } from "@/features/users/api";
import type { Project } from "@/features/projects/api";
import { NewItemButton } from "./new-item-button";

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PATCH: vi.fn(),
  PUT: vi.fn()
}));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

/** The current route; set per test. */
const nav = vi.hoisted(() => ({
  pathname: "/app/tasks",
  search: "",
  push: vi.fn(),
  replace: vi.fn()
}));
vi.mock("next/navigation", () => ({
  useRouter: () => nav,
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search)
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

const project = (id: string, title: string): Project => ({
  id,
  title,
  description: null,
  externalLink: null,
  projectLead: null,
  taskCounts: { upcoming: 0, inProgress: 0, completed: 0, total: 0 },
  loggedMinutes: 0,
  createdAt: "2026-10-01T08:00:00.000Z",
  updatedAt: "2026-10-01T08:00:00.000Z"
});
const projects = [project("p1", "Manhatan"), project("p2", "Website")];

const res = (status: number) => new Response(null, { status });
const page = <T,>(items: T[]) => ({
  data: { items, total: items.length, page: 1, pageSize: 100 },
  response: res(200)
});

type GetOptions = { params?: { path?: Record<string, string> } };

/** GET router: /me, one project, the pickers' lists, and the day of a date (no start, no logs). */
function routeGet() {
  api.GET.mockImplementation(async (path: string, options?: GetOptions) => {
    if (path === "/api/v1/me") return { data: me, response: res(200) };
    if (path === "/api/v1/projects/{id}") {
      const found = projects.find((p) => p.id === options!.params!.path!.id);
      return found
        ? { data: found, response: res(200) }
        : { error: {}, response: res(404) };
    }
    if (path === "/api/v1/projects") return page(projects);
    if (path === "/api/v1/tasks") return page([]);
    if (path === "/api/v1/users") return page([]);
    if (path === "/api/v1/workdays/{date}") {
      return {
        data: {
          workDate: options!.params!.path!.date,
          startMinute: 480,
          totalMinutes: 0,
          logs: []
        },
        response: res(200)
      };
    }
    throw new Error(`unexpected GET ${path}`);
  });
}

function withProviders(ui: React.ReactElement) {
  const queryClient = createQueryClient();
  // The shell has loaded the signed-in user before the header renders.
  queryClient.setQueryData(["users", "me"], me);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, ...render(ui, { wrapper }) };
}

const openMenu = () =>
  fireEvent.click(screen.getByRole("button", { name: /New/ }));

async function choose(name: string) {
  openMenu();
  fireEvent.click(await screen.findByRole("menuitem", { name }));
}

const field = (dialog: HTMLElement, label: string | RegExp) =>
  within(dialog).getByLabelText(label) as HTMLInputElement;

describe("NewItemButton (feat-shell-new-menu)", () => {
  beforeEach(() => {
    // "Now" is 2026-10-07 09:17 in Zagreb; only Date is faked, timers stay real.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-07T07:17:00.000Z"));
    Object.values(api).forEach((fn) => fn.mockReset());
    routeGet();
    nav.pathname = "/app/tasks";
    nav.search = "";
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC-1 FR-NOTE-009: New lists Project, Task, Note, To-do and Log, in that order", async () => {
    withProviders(<NewItemButton />);
    openMenu();
    await screen.findAllByRole("menuitem");
    expect(
      screen.getAllByRole("menuitem").map((item) => item.textContent?.trim())
    ).toEqual(["Project", "Task", "Note", "To-do", "Log"]);
  });

  it("AC-2 FR-NOTE-009: Project opens New project; Log opens Log time for today with no project or task", async () => {
    const first = withProviders(<NewItemButton />);
    await choose("Project");
    expect(
      await screen.findByRole("heading", { name: "New project" })
    ).toBeInTheDocument();
    first.unmount();

    withProviders(<NewItemButton />);
    await choose("Log");
    expect(
      await screen.findByRole("heading", { name: "Log time" })
    ).toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Date")).toHaveTextContent(
      "7 Oct 2026"
    );
    expect(field(dialog, /^Project/).value).toBe("");
    expect(field(dialog, /^Task/).value).toBe("");
  });

  it("AC-3 FR-NOTE-009: Task on a project's page starts in that project; on the task list without a project", async () => {
    nav.pathname = "/app/project";
    nav.search = "id=p1";
    const onProject = withProviders(<NewItemButton />);
    // The page's project has loaded before the menu is used.
    await waitFor(() =>
      expect(api.GET).toHaveBeenCalledWith(
        "/api/v1/projects/{id}",
        expect.anything()
      )
    );
    await waitFor(() => expect(onProject.queryClient.isFetching()).toBe(0));
    await choose("Task");
    expect(
      await screen.findByRole("heading", { name: "New task" })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(field(screen.getByRole("dialog"), "Project").value).toBe(
        "Manhatan"
      )
    );
    onProject.unmount();

    nav.pathname = "/app/tasks";
    nav.search = "";
    withProviders(<NewItemButton />);
    await choose("Task");
    expect(
      await screen.findByRole("heading", { name: "New task" })
    ).toBeInTheDocument();
    expect(field(screen.getByRole("dialog"), "Project").value).toBe("");
  });
});
