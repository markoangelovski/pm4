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
import type { Project } from "@/features/projects/api";
import type { ProjectRef, Task } from "@/features/tasks/api";
import { TaskDetail } from "./task-detail";
import { TaskFormDialog } from "./task-form-dialog";

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PATCH: vi.fn(),
  DELETE: vi.fn()
}));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
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

const project = (
  id: string,
  title: string,
  services: Project["services"]
): Project => ({
  id,
  title,
  description: null,
  externalLink: null,
  projectLead: null,
  services,
  taskCounts: { upcoming: 0, inProgress: 0, completed: 0, total: 0 },
  loggedMinutes: 0,
  createdAt: "2026-10-01T08:00:00.000Z",
  updatedAt: "2026-10-01T08:00:00.000Z"
});
const websiteProject = project("p1", "Website", [
  { id: "s2", name: "Design", taskCount: 0 },
  { id: "s1", name: "QA", taskCount: 1 }
]);
const mobileProject = project("p2", "Mobile app", []);
const projects = [mobileProject, websiteProject];

const website: ProjectRef = { id: "p1", title: "Website" };

const task: Task = {
  id: "t1",
  project: { id: "p1", title: "Website", deleted: false },
  service: { id: "s1", name: "QA" },
  title: "Write the docs",
  description: null,
  externalLink: null,
  projectLead: null,
  status: "upcoming",
  dueDate: null,
  loggedMinutes: 0,
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

type GetOptions = { params?: { path?: Record<string, string> } };

/** GET router: /me, the projects (list and by id), /tasks/{id} → `detail`, /users → none. */
let detail: Task = task;
function routeGet() {
  api.GET.mockImplementation(async (path: string, options?: GetOptions) => {
    if (path === "/api/v1/me") return { data: me, response: res(200) };
    if (path === "/api/v1/projects") {
      return {
        data: { items: projects, total: 2, page: 1, pageSize: 100 },
        response: res(200)
      };
    }
    if (path === "/api/v1/projects/{id}") {
      const found = projects.find((p) => p.id === options?.params?.path?.id);
      return found
        ? { data: found, response: res(200) }
        : problem(404, "not-found");
    }
    if (path === "/api/v1/tasks/{id}") {
      return { data: detail, response: res(200) };
    }
    if (path === "/api/v1/users") {
      return { data: { items: [] }, response: res(200) };
    }
    throw new Error(`unexpected GET ${path}`);
  });
}

function wrapperFor() {
  const queryClient = createQueryClient();
  // The shell has loaded the signed-in user before any dialog opens.
  queryClient.setQueryData(["users", "me"], me);
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NuqsTestingAdapter searchParams="?id=t1" hasMemory>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </NuqsTestingAdapter>
    );
  }
  return Wrapper;
}

function renderDialog(props: { task?: Task; defaultProject?: ProjectRef }) {
  const onOpenChange = vi.fn();
  const view = render(
    <TaskFormDialog open onOpenChange={onOpenChange} {...props} />,
    { wrapper: wrapperFor() }
  );
  return { onOpenChange, unmount: view.unmount };
}

const field = (label: string) =>
  screen.getByLabelText(label) as HTMLInputElement;

/** Types into a combobox, then opens its list (jsdom doesn't open it on input). */
function type(input: HTMLInputElement, text: string) {
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: "ArrowDown" });
}

/** Base UI's select acts on the pointer sequence, not on a bare click. */
function pick(option: HTMLElement) {
  fireEvent.pointerDown(option);
  fireEvent.mouseDown(option);
  fireEvent.pointerUp(option);
  fireEvent.mouseUp(option);
  fireEvent.click(option);
}

/** Opens the Service select once the project's services have loaded. */
async function openServices() {
  await waitFor(() => expect(field("Service")).not.toBeDisabled());
  fireEvent.click(field("Service"));
}

describe("Task service (feat-prj-services)", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    push.mockReset();
    toast.success.mockReset();
    toast.error.mockReset();
    detail = task;
    routeGet();
  });

  it("AC-18 FR-TSK-009 SCR-032: Service lists No service and the project's services; the POST has the picked serviceId", async () => {
    api.POST.mockResolvedValueOnce({ data: task, response: res(201) });
    const { onOpenChange } = renderDialog({ defaultProject: website });
    fireEvent.change(field("Title"), { target: { value: "Write the docs" } });

    await openServices();
    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "No service",
      "Design",
      "QA"
    ]);
    pick(screen.getByRole("option", { name: "QA" }));
    await waitFor(() => expect(field("Service")).toHaveTextContent("QA"));

    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(api.POST).toHaveBeenCalledWith(
      "/api/v1/tasks",
      expect.objectContaining({
        body: expect.objectContaining({ projectId: "p1", serviceId: "s1" })
      })
    );
  });

  it("AC-18 FR-TSK-009 SCR-032: another project resets the service; a project without services disables it", async () => {
    api.PATCH.mockResolvedValueOnce({ data: task, response: res(200) });
    const { onOpenChange } = renderDialog({ task });
    await waitFor(() => expect(field("Service")).toHaveTextContent("QA"));

    type(field("Project"), "Mob");
    fireEvent.click(await screen.findByRole("option", { name: "Mobile app" }));
    await waitFor(() => expect(field("Project").value).toBe("Mobile app"));
    await waitFor(() => expect(field("Service")).toBeDisabled());
    expect(field("Service")).not.toHaveTextContent("QA");

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(api.PATCH).toHaveBeenCalledWith(
      "/api/v1/tasks/{id}",
      expect.objectContaining({
        params: { path: { id: "t1" } },
        body: expect.objectContaining({ projectId: "p2", serviceId: null })
      })
    );
  });

  it("AC-18 FR-TSK-009 SCR-032: a 400 on serviceId shows under Service", async () => {
    api.PATCH.mockResolvedValueOnce(
      problem(400, "validation", [
        { field: "serviceId", message: "must be one of the project's services" }
      ])
    );
    const { onOpenChange } = renderDialog({ task });
    await waitFor(() => expect(field("Service")).toHaveTextContent("QA"));

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    const message = await screen.findByText(
      "must be one of the project's services"
    );
    expect(message.closest("[data-slot=field]")).toHaveTextContent("Service");
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("AC-19 FR-TSK-009 SCR-031: task Details shows the service's name; none → —", async () => {
    const serviceRow = async () => {
      const label = await screen.findByText("Service");
      return label.parentElement as HTMLElement;
    };

    const view = render(<TaskDetail />, { wrapper: wrapperFor() });
    expect(
      await screen.findByRole("heading", { name: "Write the docs" })
    ).toBeInTheDocument();
    expect(within(await serviceRow()).getByText("QA")).toBeInTheDocument();
    view.unmount();

    detail = { ...task, service: null };
    render(<TaskDetail />, { wrapper: wrapperFor() });
    expect(
      await screen.findByRole("heading", { name: "Write the docs" })
    ).toBeInTheDocument();
    expect(within(await serviceRow()).getByText("—")).toBeInTheDocument();
  });
});
