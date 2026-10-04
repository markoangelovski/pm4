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
import { ProjectDetail } from "./project-detail";

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  DELETE: vi.fn()
}));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => nav,
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
  createdAt: "2026-10-02T22:30:00.000Z"
};

const website: Project = {
  id: "p1",
  title: "Website",
  description: "Line one\nLine two",
  externalLink: "https://example.com/board",
  projectLead: {
    kind: "user",
    user: { id: me.id, displayName: me.displayName, avatarUrl: null },
    name: me.displayName
  },
  taskCounts: { upcoming: 3, inProgress: 1, completed: 4, total: 8 },
  createdAt: "2026-10-03T08:00:00.000Z",
  updatedAt: "2026-10-03T08:00:00.000Z"
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

/** GET router: /me → me; /projects/{id} → `detailResult()`. */
let detailResult: () => unknown;
function routeGet() {
  api.GET.mockImplementation(async (path: string) => {
    if (path === "/api/v1/me") return { data: me, response: res(200) };
    if (path === "/api/v1/projects/{id}") return detailResult();
    throw new Error(`unexpected GET ${path}`);
  });
}
const detailCalls = () =>
  api.GET.mock.calls.filter(([path]) => path === "/api/v1/projects/{id}")
    .length;

function renderDetail() {
  const queryClient = createQueryClient();
  queryClient.setQueryData(["users", "me"], me);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <NuqsTestingAdapter searchParams="?id=p1" hasMemory>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </NuqsTestingAdapter>
  );
  return render(<ProjectDetail />, { wrapper });
}

describe("ProjectDetail (feat-prj-web)", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    nav.push.mockReset();
    toast.mockReset();
    toast.error.mockReset();
    routeGet();
  });

  it("AC-13 FR-PRJ-003 FR-PRJ-008 SCR-021: details, link, lead and statistics", async () => {
    detailResult = () => ({ data: website, response: res(200) });
    renderDetail();

    expect(
      await screen.findByRole("heading", { name: "Website" })
    ).toBeInTheDocument();
    expect(screen.getByText(/Line one\s+Line two/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /example\.com\/board/ });
    expect(link).toHaveAttribute("href", "https://example.com/board");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText("Marko Angelovski")).toBeInTheDocument();

    // Scoped to the card: the Tasks section below has its own status labels (feat-tsk-web).
    const stats = within(
      screen.getByText("Statistics").closest<HTMLElement>("[data-slot=card]")!
    );
    expect(stats.getByText("Upcoming").parentElement).toHaveTextContent(
      /Upcoming\s*3/
    );
    expect(stats.getByText("In progress").parentElement).toHaveTextContent(
      /In progress\s*1/
    );
    expect(stats.getAllByText("Completed")[0].parentElement).toHaveTextContent(
      /Completed\s*4/
    );
    expect(stats.getByText("Total").parentElement).toHaveTextContent(
      /Total\s*8/
    );
    expect(stats.getByText("50 %")).toBeInTheDocument();
  });

  it("AC-14 FR-PRJ-003 FR-TRASH-002 SCR-021: not found, in the trash with Restore, and error with Retry", async () => {
    detailResult = () => notFound("not-found");
    const missing = renderDetail();
    expect(await screen.findByText("Project not found")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to projects" })
    ).toHaveAttribute("href", "/app/projects");
    missing.unmount();

    detailResult = () => notFound("in-trash");
    const trashed = renderDetail();
    expect(
      await screen.findByText("This project is in the trash")
    ).toBeInTheDocument();
    api.POST.mockResolvedValueOnce({ response: res(204) });
    detailResult = () => ({ data: website, response: res(200) });
    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    expect(
      await screen.findByRole("heading", { name: "Website" })
    ).toBeInTheDocument();
    expect(api.POST).toHaveBeenCalledWith(
      "/api/v1/projects/{id}/restore",
      expect.objectContaining({ params: { path: { id: "p1" } } })
    );
    trashed.unmount();

    detailResult = () => ({
      error: "Internal Server Error",
      response: res(500)
    });
    renderDetail();
    expect(
      await screen.findByText("Couldn't load the project.", undefined, {
        timeout: 4000
      })
    ).toBeInTheDocument();
    const before = detailCalls();
    detailResult = () => ({ data: website, response: res(200) });
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(
      await screen.findByRole("heading", { name: "Website" })
    ).toBeInTheDocument();
    expect(detailCalls()).toBeGreaterThan(before);
  });

  it("AC-15 FR-PRJ-005 SCR-021: delete confirmation; Cancel sends nothing; Delete → DELETE, toast, the list, no refetch", async () => {
    detailResult = () => ({ data: website, response: res(200) });
    renderDetail();
    await screen.findByRole("heading", { name: "Website" });

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    let dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Delete project?")).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "“Website” and its tasks move to the trash. You can restore them for 31 days."
      )
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    );
    expect(api.DELETE).not.toHaveBeenCalled();

    api.DELETE.mockResolvedValueOnce({ response: res(204) });
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    dialog = await screen.findByRole("alertdialog");
    const before = detailCalls();
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/app/projects"));
    expect(api.DELETE).toHaveBeenCalledWith(
      "/api/v1/projects/{id}",
      expect.objectContaining({ params: { path: { id: "p1" } } })
    );
    expect(toast).toHaveBeenCalledWith("Moved to trash");
    // Let any refetch the delete might trigger run, then check none did.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(detailCalls()).toBe(before);
  });
});
