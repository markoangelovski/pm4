import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import type { Me } from "@/features/users/api";
import type { Project } from "@/features/projects/api";
import type { ProjectRef, Task } from "@/features/tasks/api";
import { TaskFormDialog } from "./task-form-dialog";

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => "/app/tasks",
  useSearchParams: () => new URLSearchParams()
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
  createdAt: "2026-10-02T22:30:00.000Z"
};

const project = (id: string, title: string): Project => ({
  id,
  title,
  description: null,
  externalLink: null,
  projectLead: null,
  taskCounts: { upcoming: 0, inProgress: 0, completed: 0, total: 0 },
  createdAt: "2026-10-01T08:00:00.000Z",
  updatedAt: "2026-10-01T08:00:00.000Z"
});
const projects = [project("p2", "Mobile app"), project("p1", "Website")];

const website: ProjectRef = { id: "p1", title: "Website" };

const task: Task = {
  id: "t1",
  project: { id: "p1", title: "Website", deleted: false },
  title: "Write the docs",
  description: "First the API.",
  externalLink: null,
  projectLead: { kind: "text", user: null, name: "Bob" },
  status: "in-progress",
  dueDate: "2026-10-20",
  createdAt: "2026-10-01T08:00:00.000Z",
  updatedAt: "2026-10-01T08:00:00.000Z"
};

const res = (status: number) => new Response(null, { status });

function problem(status: number, slug: string, errors?: unknown[]) {
  const body = {
    type: `https://pm4.angelovski.top/errors/${slug}`,
    title: "Error",
    status,
    detail: "Error.",
    ...(errors ? { errors } : {})
  };
  return {
    error: body,
    response: new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/problem+json" }
    })
  };
}

/** GET router: /me → me; /projects → the picker's projects; /users → none. */
function routeGet() {
  api.GET.mockImplementation(async (path: string) => {
    if (path === "/api/v1/me") return { data: me, response: res(200) };
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
  });
}

function renderDialog(props: { task?: Task; defaultProject?: ProjectRef }) {
  const queryClient = createQueryClient();
  // The shell has loaded the signed-in user before any dialog opens.
  queryClient.setQueryData(["users", "me"], me);
  const onOpenChange = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const view = render(
    <TaskFormDialog open onOpenChange={onOpenChange} {...props} />,
    { wrapper }
  );
  return { onOpenChange, unmount: view.unmount };
}

const field = (label: string) =>
  screen.getByLabelText(label) as HTMLInputElement;
const change = (label: string, value: string) =>
  fireEvent.change(field(label), { target: { value } });

/** Types into a combobox, then opens its list (jsdom doesn't open it on input). */
function type(input: HTMLInputElement, text: string) {
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: "ArrowDown" });
}

/** Opens the due-date popover and picks a day of the shown month (October 2026). */
async function pickDay(day: number) {
  fireEvent.click(screen.getByLabelText("Due date"));
  const cell = await screen.findByRole("gridcell", { name: String(day) });
  fireEvent.click(cell.querySelector("button") ?? cell);
}

describe("TaskFormDialog (feat-tsk-web)", () => {
  beforeEach(() => {
    // "Today" is 2026-10-03 in Zagreb; only Date is faked, timers stay real.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-03T10:00:00.000Z"));
    Object.values(api).forEach((fn) => fn.mockReset());
    routeGet();
    push.mockReset();
    toast.success.mockReset();
    toast.error.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC-6 FR-TSK-001 SCR-032: create from a project → its defaults, POST, toast, closes, stays on the page", async () => {
    api.POST.mockResolvedValueOnce({
      data: { ...task, id: "t9", title: "Write the docs" },
      response: res(201)
    });
    const { onOpenChange } = renderDialog({ defaultProject: website });

    expect(
      screen.getByRole("heading", { name: "New task" })
    ).toBeInTheDocument();
    expect(field("Project").value).toBe("Website");
    expect(screen.getByLabelText("Status")).toHaveTextContent("Upcoming");
    expect(field("Project lead").value).toBe("Marko Angelovski");
    expect(screen.getByLabelText("Due date")).toHaveTextContent("No due date");

    change("Title", "Write the docs");
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(api.POST).toHaveBeenCalledTimes(1);
    expect(api.POST).toHaveBeenCalledWith(
      "/api/v1/tasks",
      expect.objectContaining({
        body: {
          projectId: "p1",
          title: "Write the docs",
          description: null,
          externalLink: null,
          projectLeadUserId: me.id,
          projectLeadName: null,
          status: "upcoming",
          dueDate: null
        }
      })
    );
    expect(toast.success).toHaveBeenCalledWith("Task created");
    expect(push).not.toHaveBeenCalled();
  });

  it("AC-7 FR-TSK-001 FR-TSK-005 SCR-032: project required, due date pick and clear, move by picking a project, API errors", async () => {
    // No project → a field error and no request.
    const create = renderDialog({});
    change("Title", "Write the docs");
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(await screen.findByText("Choose a project.")).toBeInTheDocument();
    expect(api.POST).not.toHaveBeenCalled();

    // Pick a project and a day → dueDate "2026-10-15".
    type(field("Project"), "Web");
    fireEvent.click(await screen.findByRole("option", { name: "Website" }));
    await waitFor(() => expect(field("Project").value).toBe("Website"));
    await pickDay(15);
    await waitFor(() =>
      expect(screen.getByLabelText("Due date")).toHaveTextContent("15 Oct 2026")
    );
    api.POST.mockResolvedValueOnce({ data: task, response: res(201) });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() =>
      expect(create.onOpenChange).toHaveBeenCalledWith(false)
    );
    expect(api.POST).toHaveBeenCalledWith(
      "/api/v1/tasks",
      expect.objectContaining({
        body: expect.objectContaining({
          projectId: "p1",
          dueDate: "2026-10-15"
        })
      })
    );
    create.unmount();

    // Edit: clear the due date and move to another project → PATCH.
    const edit = renderDialog({ task });
    expect(
      screen.getByRole("heading", { name: "Edit task" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Due date")).toHaveTextContent("20 Oct 2026");
    fireEvent.click(screen.getByRole("button", { name: "Clear due date" }));
    expect(screen.getByLabelText("Due date")).toHaveTextContent("No due date");
    type(field("Project"), "Mob");
    fireEvent.click(await screen.findByRole("option", { name: "Mobile app" }));
    await waitFor(() => expect(field("Project").value).toBe("Mobile app"));

    // 400 with a field error → shown under its field.
    api.PATCH.mockResolvedValueOnce(
      problem(400, "validation", [
        { field: "externalLink", message: "The link isn't allowed." }
      ])
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      await screen.findByText("The link isn't allowed.")
    ).toBeInTheDocument();
    expect(api.PATCH).toHaveBeenCalledWith(
      "/api/v1/tasks/{id}",
      expect.objectContaining({
        params: { path: { id: "t1" } },
        body: {
          projectId: "p2",
          title: "Write the docs",
          description: "First the API.",
          externalLink: null,
          projectLeadUserId: null,
          projectLeadName: "Bob",
          status: "in-progress",
          dueDate: null
        }
      })
    );

    // 404 (the project was deleted meanwhile) → under Project.
    api.PATCH.mockResolvedValueOnce(problem(404, "not-found"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Choose a project.")).toBeInTheDocument();

    // 500 → toast; the dialog stays open.
    api.PATCH.mockResolvedValueOnce({
      error: "Internal Server Error",
      response: res(500)
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't save the task.")
    );
    expect(edit.onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
