import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps, ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { createQueryClient } from "@/lib/query-client";
import type { Me } from "@/features/users/api";
import type { Project, ProjectList } from "@/features/projects/api";
import { ProjectDetail } from "./project-detail";
import { ProjectsList } from "./projects-list";

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  DELETE: vi.fn()
}));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/app/projects",
  useSearchParams: () => new URLSearchParams("id=p1")
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

// Created just before midnight UTC, so the date shows only in the user's zone.
const website: Project = {
  id: "p1",
  title: "Website",
  description: null,
  externalLink: null,
  projectLead: { kind: "text", user: null, name: "Bob Builder" },
  taskCounts: { upcoming: 0, inProgress: 0, completed: 0, total: 0 },
  createdAt: "2026-10-02T22:30:00.000Z",
  updatedAt: "2026-10-04T12:05:00.000Z"
};

const list: ProjectList = { items: [website], total: 1, page: 1, pageSize: 25 };

const res = (status: number) => new Response(null, { status });

function renderWith(ui: ReactNode, search: string) {
  const queryClient = createQueryClient();
  queryClient.setQueryData(["users", "me"], me);
  return render(
    <NuqsTestingAdapter searchParams={search} hasMemory>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </NuqsTestingAdapter>
  );
}

describe("Project dates and lead search (feat-prj-dates-lead-search)", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    api.GET.mockImplementation(async (path: string) => {
      if (path === "/api/v1/me") return { data: me, response: res(200) };
      if (path === "/api/v1/projects")
        return { data: list, response: res(200) };
      if (path === "/api/v1/projects/{id}")
        return { data: website, response: res(200) };
      throw new Error(`unexpected GET ${path}`);
    });
  });

  it("AC-8 FR-PRJ-002 SCR-020: Created and Updated columns show short dates in the user's time zone", async () => {
    renderWith(<ProjectsList />, "");

    const row = (await screen.findByRole("link", { name: "Website" })).closest(
      "tr"
    )!;
    const headers = screen
      .getAllByRole("columnheader")
      .map((th) => th.textContent?.trim());
    const created = headers.indexOf("Created");
    const updated = headers.indexOf("Updated");
    expect(created).toBeGreaterThan(-1);
    expect(updated).toBe(created + 1);

    const cells = within(row).getAllByRole("cell");
    expect(cells[created]).toHaveTextContent("3 Oct 2026");
    expect(cells[updated]).toHaveTextContent("4 Oct 2026");
  });

  it("AC-9 FR-PRJ-002 SCR-020: the search box says it searches by title or lead", async () => {
    renderWith(<ProjectsList />, "");

    expect(
      await screen.findByPlaceholderText("Search by title or lead…")
    ).toBeInTheDocument();
  });

  it("AC-10 FR-PRJ-003 SCR-021: Details shows Created and Last modified with date and time", async () => {
    renderWith(<ProjectDetail />, "?id=p1");

    await screen.findByRole("heading", { name: "Website" });
    expect(screen.getByText("Created").parentElement).toHaveTextContent(
      "3 October 2026, 00:30"
    );
    expect(screen.getByText("Last modified").parentElement).toHaveTextContent(
      "4 October 2026, 14:05"
    );
  });
});
