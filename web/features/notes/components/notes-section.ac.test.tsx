import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps, ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import type { Me } from "@/features/users/api";
import type { Todo } from "../api";
import { NotesSection } from "./notes-section";

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PUT: vi.fn(),
  PATCH: vi.fn(),
  DELETE: vi.fn()
}));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/app/project",
  useSearchParams: () => new URLSearchParams()
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
  dailyTargetMinutes: 420,
  createdAt: "2026-10-02T22:30:00.000Z"
};

// jsdom has no PointerEvent, and Base UI's checkbox dispatches one on click; a MouseEvent with a pointerId stands in.
if (typeof window.PointerEvent === "undefined") {
  class PointerEventStub extends MouseEvent {
    readonly pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
    }
  }
  window.PointerEvent = PointerEventStub as unknown as typeof PointerEvent;
}

const P = "0f5f3c1e-7a1b-4c2d-8e9f-1a2b3c4d5e6f";
const website = { id: P, title: "Website" };
const link = { project: website, task: null };

const todo = (
  id: string,
  text: string,
  createdAt: string,
  doneAt: string | null = null
): Todo => ({
  id,
  text,
  doneAt,
  project: { id: P, title: "Website", deleted: false },
  task: null,
  createdAt,
  updatedAt: createdAt
});

// The API returns the newest change first; the card orders by creation itself.
const A = todo("a", "Alpha", "2026-10-01T08:00:00.000Z");
const B = todo(
  "b",
  "Bravo",
  "2026-10-02T08:00:00.000Z",
  "2026-10-04T08:00:00.000Z"
);
const C = todo("c", "Charlie", "2026-10-03T08:00:00.000Z");

/** What GET /todos answers. */
let todos: Todo[] = [];

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

const requested = (target: string) =>
  api.GET.mock.calls
    .filter(([path]) => path === target)
    .map(([path, options]) => urlOf(path as string, options as GetOptions));

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  todos = [C, B, A];
  api.GET.mockImplementation(async (path: string) => {
    if (path === "/api/v1/me") return { data: me, response: res(200) };
    if (path === "/api/v1/notes")
      return {
        data: { items: [], page: 1, pageSize: 3, total: 0 },
        response: res(200)
      };
    if (path === "/api/v1/todos")
      return { data: { items: todos }, response: res(200) };
    throw new Error(`unexpected GET ${path}`);
  });
});

function renderSection() {
  const queryClient = createQueryClient();
  queryClient.setQueryData(["users", "me"], me);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<NotesSection link={link} />, { wrapper });
}

/** The To-dos card's to-do texts, top to bottom (the Notes card has no checkboxes). */
const shownTexts = () =>
  screen
    .queryAllByRole("checkbox")
    .map((box) =>
      (box.getAttribute("aria-label") ?? "").replace(
        /^(Mark|Reopen) “(.*)”( done)?$/,
        "$2"
      )
    );

describe("NotesSection (feat-prj-lists)", () => {
  it("AC-12 FR-NOTE-008 SCR-073: a project's Notes card lists its notes title A–Z, three at first", async () => {
    renderSection();

    await waitFor(() =>
      expect(requested("/api/v1/notes")).toContain(
        `/api/v1/notes?projectId=${P}&sort=title%3Aasc&page=1&pageSize=3`
      )
    );
  });

  it("AC-13 FR-NOTE-008 SCR-073: the To-dos card lists by creation, done ones in their places; ticking one off doesn't move it", async () => {
    renderSection();

    await screen.findByRole("checkbox", { name: "Mark “Alpha” done" });
    expect(shownTexts()).toEqual(["Alpha", "Charlie"]);
    fireEvent.click(screen.getByRole("button", { name: "Show done (1)" }));

    await waitFor(() =>
      expect(shownTexts()).toEqual(["Alpha", "Bravo", "Charlie"])
    );
    fireEvent.click(screen.getByRole("button", { name: "Hide done" }));
    await waitFor(() => expect(shownTexts()).toEqual(["Alpha", "Charlie"]));

    const doneA = { ...A, doneAt: "2026-10-05T08:00:00.000Z" };
    api.PATCH.mockImplementation(async () => {
      todos = [doneA, C, B];
      return { data: doneA, response: res(200) };
    });
    const before = requested("/api/v1/todos").length;
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Mark “Alpha” done" })
    );

    await waitFor(() => expect(api.PATCH).toHaveBeenCalled());
    await waitFor(() =>
      expect(requested("/api/v1/todos").length).toBeGreaterThan(before)
    );
    await screen.findByRole("checkbox", { name: "Reopen “Alpha”" });
    expect(shownTexts()).toEqual(["Alpha", "Charlie"]);
    expect(
      screen.getByRole("button", { name: "Show done (1)" })
    ).toBeInTheDocument();
  });
});
