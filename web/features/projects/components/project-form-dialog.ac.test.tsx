import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps, ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import type { Me } from "@/features/users/api";
import type { Project } from "@/features/projects/api";
import { ProjectFormDialog } from "./project-form-dialog";

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => "/app/projects",
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

const project: Project = {
  id: "p1",
  title: "Website",
  description: "The new site",
  externalLink: "https://example.com/board",
  projectLead: { kind: "text", user: null, name: "Bob" },
  taskCounts: { upcoming: 0, inProgress: 0, completed: 0, total: 0 },
  createdAt: "2026-10-03T08:00:00.000Z",
  updatedAt: "2026-10-03T08:00:00.000Z"
};

/** The dialog's `project` prop (an API `Project`). */
const asProp = (p: Project) =>
  p as unknown as NonNullable<
    ComponentProps<typeof ProjectFormDialog>["project"]
  >;

const res = (status: number) => new Response(null, { status });

function renderDialog(edit?: Project) {
  const queryClient = createQueryClient();
  // The shell has loaded the signed-in user before any dialog opens.
  queryClient.setQueryData(["users", "me"], me);
  const onOpenChange = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  render(
    <ProjectFormDialog
      open
      onOpenChange={onOpenChange}
      project={edit ? asProp(edit) : undefined}
    />,
    { wrapper }
  );
  return { onOpenChange };
}

const field = (label: string) =>
  screen.getByLabelText(label) as HTMLInputElement;
const change = (label: string, value: string) =>
  fireEvent.change(field(label), { target: { value } });

describe("ProjectFormDialog: create (feat-prj-web)", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    api.GET.mockResolvedValue({ data: me, response: res(200) });
    push.mockReset();
    toast.success.mockReset();
  });

  it("AC-9 FR-PRJ-001 FR-PRJ-006: lead = me; title and link validation; valid submit → POST, toast and the new project's page", async () => {
    renderDialog();
    expect(
      screen.getByRole("heading", { name: "New project" })
    ).toBeInTheDocument();
    expect(field("Project lead").value).toBe("Marko Angelovski");

    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(await screen.findByText("Enter a title.")).toBeInTheDocument();

    change("Title", "Website");
    change("External link", "x.dev");
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(
      await screen.findByText(
        "Enter a full link starting with http:// or https://."
      )
    ).toBeInTheDocument();
    expect(api.POST).not.toHaveBeenCalled();

    api.POST.mockResolvedValue({
      data: { ...project, id: "p9", title: "Website" },
      response: res(201)
    });
    change("External link", "");
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/app/project?id=p9")
    );
    expect(api.POST).toHaveBeenCalledTimes(1);
    expect(api.POST).toHaveBeenCalledWith(
      "/api/v1/projects",
      expect.objectContaining({
        body: {
          title: "Website",
          description: null,
          externalLink: null,
          projectLeadUserId: me.id,
          projectLeadName: null
        }
      })
    );
    expect(toast.success).toHaveBeenCalledWith("Project created");
  });
});

describe("ProjectFormDialog: edit (feat-prj-web)", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    api.GET.mockResolvedValue({ data: me, response: res(200) });
    toast.error.mockReset();
  });

  it("AC-10 FR-PRJ-004 FR-PRJ-006: saved values; cleared lead → both null; API field error under the lead; 500 → toast; pending disables Save", async () => {
    const { onOpenChange } = renderDialog(project);
    expect(
      screen.getByRole("heading", { name: "Edit project" })
    ).toBeInTheDocument();
    expect(field("Title").value).toBe("Website");
    expect(field("External link").value).toBe("https://example.com/board");
    expect(field("Project lead").value).toBe("Bob");

    fireEvent.click(screen.getByRole("button", { name: "Clear project lead" }));

    // 400 with a field error → shown under Project lead, dialog stays open.
    api.PATCH.mockResolvedValueOnce({
      error: {
        type: "https://pm4.angelovski.top/errors/validation",
        title: "Bad Request",
        status: 400,
        detail: "The request is invalid.",
        errors: [
          { field: "projectLeadUserId", message: "Pick an existing user." }
        ]
      },
      response: res(400)
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      await screen.findByText("Pick an existing user.")
    ).toBeInTheDocument();
    expect(api.PATCH).toHaveBeenCalledWith(
      "/api/v1/projects/{id}",
      expect.objectContaining({
        params: { path: { id: "p1" } },
        body: {
          title: "Website",
          description: "The new site",
          externalLink: "https://example.com/board",
          projectLeadUserId: null,
          projectLeadName: null
        }
      })
    );

    // 500 → toast, dialog stays open.
    api.PATCH.mockResolvedValueOnce({
      error: "Internal Server Error",
      response: res(500)
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't save the project.")
    );
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    // Pending → the button is disabled and reads "Saving…".
    api.PATCH.mockReturnValueOnce(new Promise(() => {}));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      await screen.findByRole("button", { name: "Saving…" })
    ).toBeDisabled();
  });
});
