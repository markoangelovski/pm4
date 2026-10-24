import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps, ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { createQueryClient } from "@/lib/query-client";
import type { Me } from "@/features/users/api";
import type { Todo } from "../api";
import { NotesView } from "./notes-view";

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PUT: vi.fn(),
  PATCH: vi.fn(),
  DELETE: vi.fn()
}));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => nav,
  usePathname: () => "/app/notes",
  useSearchParams: () => new URLSearchParams()
}));

// A plain anchor keeps the exact href (next.config isn't loaded in Vitest).
vi.mock("next/link", () => ({
  default: ({ href, ...props }: { href: string } & ComponentProps<"a">) => (
    <a href={href} {...props} />
  )
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

const P = "0f5f3c1e-7a1b-4c2d-8e9f-1a2b3c4d5e6f";

const project = {
  id: P,
  title: "Website",
  description: null,
  externalLink: null,
  projectLead: null,
  taskCounts: { upcoming: 0, inProgress: 0, completed: 0, total: 0 },
  loggedMinutes: 0,
  createdAt: "2026-10-01T08:00:00.000Z",
  updatedAt: "2026-10-01T08:00:00.000Z"
};

const todo = (id: string, doneAt: string | null): Todo => ({
  id,
  text: `To-do ${id}`,
  doneAt,
  project: null,
  task: null,
  createdAt: "2026-10-01T08:00:00.000Z",
  updatedAt: "2026-10-01T08:00:00.000Z"
});

/** Every to-do: two open, one done. */
const allTodos = [
  todo("d1", null),
  todo("d2", null),
  todo("d3", "2026-10-05T08:00:00.000Z")
];

const res = (status: number) => new Response(null, { status });

type GetOptions = { params?: { query?: Record<string, unknown> } };

/** The request URL openapi-fetch would build for `GET(path, { params })`. */
const urlOf = (path: string, options?: GetOptions) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(options?.params?.query ?? {}))
    if (value !== undefined) query.append(key, String(value));
  const search = query.toString();
  return search ? `${path}?${search}` : path;
};

/** The /notes and /todos URLs requested so far. */
const requested = () =>
  api.GET.mock.calls
    .filter(([path]) => path === "/api/v1/notes" || path === "/api/v1/todos")
    .map(([path, options]) => urlOf(path as string, options as GetOptions));

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  api.GET.mockImplementation(async (path: string, options?: GetOptions) => {
    if (path === "/api/v1/me") return { data: me, response: res(200) };
    if (path === "/api/v1/projects")
      return {
        data: { items: [project], page: 1, pageSize: 100, total: 1 },
        response: res(200)
      };
    if (path === "/api/v1/notes")
      return {
        data: { items: [], page: 1, pageSize: 20, total: 0 },
        response: res(200)
      };
    if (path === "/api/v1/todos") {
      const filtered = Object.values(options?.params?.query ?? {}).some(
        (v) => v !== undefined
      );
      return {
        data: { items: filtered ? [] : allTodos },
        response: res(200)
      };
    }
    throw new Error(`unexpected GET ${path}`);
  });
});

function renderView(search = "") {
  const queryClient = createQueryClient();
  queryClient.setQueryData(["users", "me"], me);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <NuqsTestingAdapter searchParams={search} hasMemory>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </NuqsTestingAdapter>
  );
  return render(<NotesView />, { wrapper });
}

describe("NotesView (feat-note-todos)", () => {
  it("AC-15 FR-NOTE-002 SCR-070: no params → General notes, newest change first, page 1 of 20; the To-dos tab counts every open to-do", async () => {
    renderView();

    await waitFor(() =>
      expect(requested()).toContain(
        "/api/v1/notes?unlinked=true&sort=updatedAt%3Adesc&page=1&pageSize=20"
      )
    );
    expect(requested()).toContain("/api/v1/todos");
    const tab = await screen.findByRole("tab", { name: /To-dos/ });
    await waitFor(() => expect(tab).toHaveTextContent("2"));
  });

  it("AC-15 FR-NOTE-002 SCR-070: ?show=<project> → that project's notes", async () => {
    renderView(`?show=${P}`);

    await waitFor(() =>
      expect(requested()).toContain(
        `/api/v1/notes?projectId=${P}&sort=updatedAt%3Adesc&page=1&pageSize=20`
      )
    );
  });

  it("AC-15 FR-NOTE-002 SCR-070: ?show=all → every note", async () => {
    renderView("?show=all");

    await waitFor(() =>
      expect(requested()).toContain(
        "/api/v1/notes?sort=updatedAt%3Adesc&page=1&pageSize=20"
      )
    );
  });

  it("AC-15 FR-NOTE-002 SCR-070: ?show=<unknown> → General", async () => {
    renderView("?show=0f5f3c1e-0000-4c2d-8e9f-000000000000");

    await waitFor(() => expect(requested().length).toBeGreaterThan(0));
    await waitFor(() =>
      expect(requested()).toContain(
        "/api/v1/notes?unlinked=true&sort=updatedAt%3Adesc&page=1&pageSize=20"
      )
    );
  });

  it("AC-15 FR-NOTE-002 FR-NOTE-003 SCR-070: ?tab=todos&q=x&from&to → the to-dos with that search and range", async () => {
    renderView("?tab=todos&q=x&from=2026-10-01&to=2026-10-09");

    await waitFor(() =>
      expect(requested()).toContain(
        "/api/v1/todos?unlinked=true&q=x&sort=updatedAt%3Adesc&from=2026-10-01&to=2026-10-09"
      )
    );
  });
});
