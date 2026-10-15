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
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { createQueryClient } from "@/lib/query-client";
import type { Me } from "@/features/users/api";
import type { Task } from "@/features/tasks/api";
import { TaskDetail } from "./task-detail";

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PATCH: vi.fn(),
  DELETE: vi.fn()
}));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => nav,
  usePathname: () => "/app/task",
  useSearchParams: () => new URLSearchParams("id=t1")
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

// "Today" is 2026-10-03 in Zagreb, so the due date is overdue.
const docs: Task = {
  id: "t1",
  project: { id: "p1", title: "Website", deleted: false },
  title: "Write the docs",
  description: "Line one\nLine two",
  externalLink: "https://example.com/spec",
  projectLead: { kind: "text", user: null, name: "Bob Builder" },
  status: "upcoming",
  dueDate: "2026-10-02",
  loggedMinutes: 0,
  createdAt: "2026-10-01T08:00:00.000Z",
  updatedAt: "2026-10-02T08:00:00.000Z"
};

const res = (status: number) => new Response(null, { status });

function notFound(slug: string) {
  const body = {
    type: `https://pm4.angelovski.top/errors/${slug}`,
    title: "Not Found",
    status: 404,
    detail: "Not found."
  };
  return {
    error: body,
    response: new Response(JSON.stringify(body), {
      status: 404,
      headers: { "content-type": "application/problem+json" }
    })
  };
}

/** GET router: /me → me; /tasks/{id} → `detailResult()`; /projects → none (the dialogs' pickers). */
let detailResult: () => unknown;
function routeGet() {
  api.GET.mockImplementation(async (path: string) => {
    if (path === "/api/v1/me") return { data: me, response: res(200) };
    if (path === "/api/v1/tasks/{id}") return detailResult();
    if (path === "/api/v1/projects") {
      return {
        data: { items: [], total: 0, page: 1, pageSize: 100 },
        response: res(200)
      };
    }
    throw new Error(`unexpected GET ${path}`);
  });
}
const detailCalls = () =>
  api.GET.mock.calls.filter(([path]) => path === "/api/v1/tasks/{id}").length;

/** Base UI's select acts on the pointer sequence, not on a bare click. */
function pick(option: HTMLElement) {
  fireEvent.pointerDown(option);
  fireEvent.mouseDown(option);
  fireEvent.pointerUp(option);
  fireEvent.mouseUp(option);
  fireEvent.click(option);
}

function renderDetail() {
  const queryClient = createQueryClient();
  queryClient.setQueryData(["users", "me"], me);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <NuqsTestingAdapter searchParams="?id=t1" hasMemory>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </NuqsTestingAdapter>
  );
  return render(<TaskDetail />, { wrapper });
}

describe("TaskDetail (feat-tsk-web)", () => {
  beforeEach(() => {
    // Only Date is faked (for "today"); timers stay real.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-03T10:00:00.000Z"));
    Object.values(api).forEach((fn) => fn.mockReset());
    nav.push.mockReset();
    toast.mockReset();
    toast.error.mockReset();
    routeGet();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC-13 FR-TSK-004 FR-TSK-006 FR-TSK-008 SCR-031: details, links, badge, empty fields and the inline status", async () => {
    detailResult = () => ({ data: docs, response: res(200) });
    const full = renderDetail();

    expect(
      await screen.findByRole("heading", { name: "Write the docs" })
    ).toBeInTheDocument();
    expect(api.GET).toHaveBeenCalledWith(
      "/api/v1/tasks/{id}",
      expect.objectContaining({
        params: expect.objectContaining({ path: { id: "t1" } })
      })
    );
    expect(screen.getByRole("link", { name: "Tasks" })).toHaveAttribute(
      "href",
      "/app/tasks"
    );
    expect(screen.getByRole("link", { name: "Website" })).toHaveAttribute(
      "href",
      "/app/project?id=p1"
    );
    expect(screen.getByText("2 Oct 2026")).toBeInTheDocument();
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.getByText("Bob Builder")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /example\.com\/spec/ });
    expect(link).toHaveAttribute("href", "https://example.com/spec");
    expect(link).toHaveAttribute("target", "_blank");
    expect(screen.getByText(/Line one\s+Line two/)).toBeInTheDocument();

    api.PATCH.mockResolvedValueOnce({
      data: { ...docs, status: "completed" },
      response: res(200)
    });
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
    full.unmount();

    detailResult = () => ({
      data: {
        ...docs,
        description: null,
        externalLink: null,
        projectLead: null,
        dueDate: null
      },
      response: res(200)
    });
    renderDetail();
    await screen.findByRole("heading", { name: "Write the docs" });
    // Due date, project lead, external link and description.
    expect(screen.getAllByText("—")).toHaveLength(4);
  });

  it("AC-14 FR-TSK-004 SCR-031: not found, and error with Retry", async () => {
    detailResult = () => notFound("not-found");
    const missing = renderDetail();
    expect(await screen.findByText("Task not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to tasks" })).toHaveAttribute(
      "href",
      "/app/tasks"
    );
    expect(screen.queryByRole("button", { name: /Restore/ })).toBeNull();
    missing.unmount();

    detailResult = () => ({
      error: "Internal Server Error",
      response: res(500)
    });
    renderDetail();
    expect(
      await screen.findByText("Couldn't load the task.", undefined, {
        timeout: 4000
      })
    ).toBeInTheDocument();
    const before = detailCalls();
    detailResult = () => ({ data: docs, response: res(200) });
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(
      await screen.findByRole("heading", { name: "Write the docs" })
    ).toBeInTheDocument();
    expect(detailCalls()).toBeGreaterThan(before);
  });

  it("AC-11 FR-TSK-007 SCR-031: permanent delete confirmation → DELETE, toast, the project's page, no refetch", async () => {
    detailResult = () => ({ data: docs, response: res(200) });
    renderDetail();
    await screen.findByRole("heading", { name: "Write the docs" });

    api.DELETE.mockResolvedValueOnce({ response: res(204) });
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Delete task?")).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "“Write the docs” will be deleted permanently. Its logged time stays."
      )
    ).toBeInTheDocument();
    const before = detailCalls();
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(nav.push).toHaveBeenCalledWith("/app/project?id=p1")
    );
    expect(api.DELETE).toHaveBeenCalledWith(
      "/api/v1/tasks/{id}",
      expect.objectContaining({ params: { path: { id: "t1" } } })
    );
    expect(toast).toHaveBeenCalledWith("Task deleted");
    // Let any refetch the delete might trigger run, then check none did.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(detailCalls()).toBe(before);
  });
});

describe("TaskDetail logged time (feat-proto-sync-web)", () => {
  const timeLogQueries = () =>
    api.GET.mock.calls
      .filter(([path]) => path === "/api/v1/time-logs")
      .map(
        ([, init]) =>
          (init as { params: { query: Record<string, unknown> } }).params.query
      );

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-03T10:00:00.000Z"));
    Object.values(api).forEach((fn) => fn.mockReset());
    routeGet();
    const taskRoutes = api.GET.getMockImplementation()!;
    api.GET.mockImplementation(async (path: string, init?: unknown) => {
      if (path === "/api/v1/time-logs") {
        return {
          data: {
            items: [],
            page: 1,
            pageSize: 25,
            total: 0,
            totalMinutes: 0,
            bookedMinutes: 0
          },
          response: res(200)
        };
      }
      return taskRoutes(path, init);
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC-16 FR-TLOG-012 SCR-031 SCR-044: the task page shows Logged time for the task, not when it isn't found", async () => {
    detailResult = () => ({ data: docs, response: res(200) });
    const view = renderDetail();
    expect(await screen.findByText("Logged time")).toBeInTheDocument();
    await waitFor(() =>
      expect(timeLogQueries()).toContainEqual(
        expect.objectContaining({ taskId: "t1", page: 1 })
      )
    );
    expect(timeLogQueries().every((q) => !("projectId" in q))).toBe(true);
    view.unmount();

    api.GET.mockClear();
    detailResult = () => notFound("not-found");
    renderDetail();
    expect(await screen.findByText("Task not found")).toBeInTheDocument();
    expect(screen.queryByText("Logged time")).toBeNull();
    expect(timeLogQueries()).toEqual([]);
  });
});
