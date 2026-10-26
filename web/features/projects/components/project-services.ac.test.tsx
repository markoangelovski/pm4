import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps, ReactNode } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within
} from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { createQueryClient } from "@/lib/query-client";
import type { Me } from "@/features/users/api";
import {
  projectKeys,
  useCreateProject,
  useDeleteProject,
  useServiceNames,
  useUpdateProject,
  type Project,
  type ProjectInput
} from "@/features/projects/api";
import { ProjectDetail } from "./project-detail";
import { ProjectFormDialog } from "./project-form-dialog";

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
  usePathname: () => "/app/project",
  useSearchParams: () => new URLSearchParams("id=p1")
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

const service = (id: string, name: string, taskCount: number) => ({
  id,
  name,
  taskCount
});

const website: Project = {
  id: "p1",
  title: "Website",
  description: null,
  externalLink: null,
  projectLead: { kind: "text", user: null, name: "Bob" },
  services: [service("s2", "Design", 0), service("s1", "QA", 2)],
  taskCounts: { upcoming: 2, inProgress: 0, completed: 0, total: 2 },
  loggedMinutes: 0,
  createdAt: "2026-10-03T08:00:00.000Z",
  updatedAt: "2026-10-03T08:00:00.000Z"
};

const input: ProjectInput = {
  title: "Website",
  description: null,
  externalLink: null,
  projectLeadUserId: null,
  projectLeadName: "Bob",
  services: ["QA"]
};

/** API-PRJ-006's names: other projects' services. */
const SERVICE_NAMES = ["Backend development", "Design", "QA"];

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

/** GET router: /me → me; /projects/service-names → the names; /projects/{id} → `detail`; /users, /tasks → none. */
let detail: Project = website;
function routeGet() {
  api.GET.mockImplementation(async (path: string) => {
    if (path === "/api/v1/me") return { data: me, response: res(200) };
    if (path === "/api/v1/projects/service-names") {
      return { data: { items: SERVICE_NAMES }, response: res(200) };
    }
    if (path === "/api/v1/projects/{id}") {
      return { data: detail, response: res(200) };
    }
    if (path === "/api/v1/users" || path === "/api/v1/tasks") {
      return {
        data: { items: [], total: 0, page: 1, pageSize: 25 },
        response: res(200)
      };
    }
    throw new Error(`unexpected GET ${path}`);
  });
}

function wrapperFor(queryClient: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NuqsTestingAdapter searchParams="?id=p1" hasMemory>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </NuqsTestingAdapter>
    );
  }
  return Wrapper;
}

function newQueryClient() {
  const queryClient = createQueryClient();
  // The shell has loaded the signed-in user before any dialog opens.
  queryClient.setQueryData(["users", "me"], me);
  return queryClient;
}

/** The dialog's `project` prop (an API `Project`). */
const asProp = (p: Project) =>
  p as unknown as NonNullable<
    ComponentProps<typeof ProjectFormDialog>["project"]
  >;

function renderDialog(edit?: Project) {
  const onOpenChange = vi.fn();
  render(
    <ProjectFormDialog
      open
      onOpenChange={onOpenChange}
      project={edit ? asProp(edit) : undefined}
    />,
    { wrapper: wrapperFor(newQueryClient()) }
  );
  return { onOpenChange };
}

const field = (label: string) =>
  screen.getByLabelText(label) as HTMLInputElement;

/** Types into a combobox, then opens its list (jsdom doesn't open it on input). */
function type(input: HTMLInputElement, text: string) {
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: "ArrowDown" });
}

/** Removes the Services chip named `name` with its × button. */
function removeChip(name: string) {
  const chip = screen.getByLabelText(name);
  fireEvent.click(within(chip).getByRole("button"));
}

const invalidated = (queryClient: QueryClient, key: readonly unknown[]) =>
  queryClient.getQueryState(key)?.isInvalidated;

describe("Project services (feat-prj-services)", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    push.mockReset();
    toast.success.mockReset();
    toast.error.mockReset();
    detail = website;
    routeGet();
  });

  it("AC-13 FR-PRJ-009: useServiceNames reads API-PRJ-006; create, update and delete invalidate it; update also invalidates tasks", async () => {
    const names = renderHook(() => useServiceNames(), {
      wrapper: wrapperFor(newQueryClient())
    });
    await waitFor(() =>
      expect(names.result.current.data).toEqual(SERVICE_NAMES)
    );
    expect(api.GET).toHaveBeenCalledWith(
      "/api/v1/projects/service-names",
      expect.anything()
    );
    names.unmount();

    const seeded = () => {
      const queryClient = newQueryClient();
      queryClient.setQueryData(projectKeys.serviceNames(), SERVICE_NAMES);
      queryClient.setQueryData(["tasks", "list", {}], []);
      return queryClient;
    };

    api.POST.mockResolvedValueOnce({ data: website, response: res(201) });
    const createClient = seeded();
    const create = renderHook(() => useCreateProject(), {
      wrapper: wrapperFor(createClient)
    });
    await act(() => create.result.current.mutateAsync(input));
    expect(api.POST).toHaveBeenCalledWith(
      "/api/v1/projects",
      expect.objectContaining({ body: input })
    );
    expect(invalidated(createClient, projectKeys.serviceNames())).toBe(true);
    create.unmount();

    api.PATCH.mockResolvedValueOnce({ data: website, response: res(200) });
    const updateClient = seeded();
    const update = renderHook(() => useUpdateProject("p1"), {
      wrapper: wrapperFor(updateClient)
    });
    await act(() => update.result.current.mutateAsync(input));
    expect(invalidated(updateClient, projectKeys.serviceNames())).toBe(true);
    expect(invalidated(updateClient, ["tasks", "list", {}])).toBe(true);
    update.unmount();

    api.DELETE.mockResolvedValueOnce({ response: res(204) });
    const deleteClient = seeded();
    const remove = renderHook(() => useDeleteProject(), {
      wrapper: wrapperFor(deleteClient)
    });
    await act(() => remove.result.current.mutateAsync("p1"));
    expect(invalidated(deleteClient, projectKeys.serviceNames())).toBe(true);
  });

  it("AC-14 FR-PRJ-009 SCR-022: Services suggests API-PRJ-006's names and adds a new one; the POST body has both", async () => {
    api.POST.mockResolvedValueOnce({
      data: { ...website, id: "p9" },
      response: res(201)
    });
    renderDialog();
    fireEvent.change(field("Title"), { target: { value: "Website" } });

    type(field("Services"), "back");
    fireEvent.click(
      await screen.findByRole("option", { name: "Backend development" })
    );
    expect(
      await screen.findByLabelText("Backend development")
    ).toBeInTheDocument();

    type(field("Services"), "Ops");
    fireEvent.click(await screen.findByRole("option", { name: "Add “Ops”" }));
    expect(await screen.findByLabelText("Ops")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(api.POST).toHaveBeenCalledTimes(1));
    expect(api.POST).toHaveBeenCalledWith(
      "/api/v1/projects",
      expect.objectContaining({
        body: expect.objectContaining({
          services: ["Backend development", "Ops"]
        })
      })
    );
  });

  it("AC-15 FR-PRJ-009 SCR-022: removing a service in use warns with its task count; Save sends the remaining names", async () => {
    const warning = (text: string) => screen.queryByText(text);
    const twoTasks = "2 tasks use “QA”. They'll have no service.";

    // taskCount 2 → the plural warning; Save sends the rest.
    api.PATCH.mockResolvedValueOnce({ data: website, response: res(200) });
    const { onOpenChange } = renderDialog(website);
    expect(warning(twoTasks)).toBeNull();
    removeChip("QA");
    expect(await screen.findByText(twoTasks)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(api.PATCH).toHaveBeenCalledTimes(1);
    expect(api.PATCH).toHaveBeenCalledWith(
      "/api/v1/projects/{id}",
      expect.objectContaining({
        params: { path: { id: "p1" } },
        body: expect.objectContaining({ services: ["Design"] })
      })
    );
  });

  it("AC-15 FR-PRJ-009 SCR-022: one task → the singular warning; no tasks → none", async () => {
    const oneTask = "1 task uses “QA”. It'll have no service.";
    renderDialog({
      ...website,
      services: [service("s2", "Design", 0), service("s1", "QA", 1)]
    });
    removeChip("QA");
    expect(await screen.findByText(oneTask)).toBeInTheDocument();

    removeChip("Design");
    expect(screen.queryByText(/“Design”/)).toBeNull();
  });

  it("AC-16 FR-PRJ-009 SCR-022: a 400 on services shows under Services and the dialog stays open", async () => {
    api.PATCH.mockResolvedValueOnce(
      problem(400, "validation", [
        {
          field: "services",
          message: "services must not repeat a name (ignoring case)"
        }
      ])
    );
    const { onOpenChange } = renderDialog(website);

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("services must not repeat a name (ignoring case)")
    ).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("AC-17 FR-PRJ-009 SCR-021: project Details lists the services; none → —", async () => {
    const services = async () => {
      const label = await screen.findByText("Services");
      return label.parentElement as HTMLElement;
    };

    const view = render(<ProjectDetail />, {
      wrapper: wrapperFor(newQueryClient())
    });
    expect(
      await screen.findByRole("heading", { name: "Website" })
    ).toBeInTheDocument();
    const row = await services();
    expect(within(row).getByText("Design")).toBeInTheDocument();
    expect(within(row).getByText("QA")).toBeInTheDocument();
    view.unmount();

    detail = { ...website, services: [] };
    render(<ProjectDetail />, { wrapper: wrapperFor(newQueryClient()) });
    expect(
      await screen.findByRole("heading", { name: "Website" })
    ).toBeInTheDocument();
    expect(within(await services()).getByText("—")).toBeInTheDocument();
  });
});
