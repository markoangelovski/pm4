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
import type { Task } from "@/features/tasks/api";
import { NO_LOG_LINK, setLastLogLink } from "../last-log-link";
import type { TimeLog } from "../types";
import { LogFormDialog } from "./log-form-dialog";

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PATCH: vi.fn(),
  PUT: vi.fn()
}));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/app/time",
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
  services: [],
  loggedMinutes: 0,
  createdAt: "2026-10-01T08:00:00.000Z",
  updatedAt: "2026-10-01T08:00:00.000Z"
});
const projects = [project("p1", "Manhatan"), project("p2", "Website")];

const task = (id: string, title: string, p: Project): Task => ({
  id,
  project: { id: p.id, title: p.title, deleted: false },
  service: null,
  title,
  description: null,
  externalLink: null,
  projectLead: null,
  status: "upcoming",
  dueDate: null,
  loggedMinutes: 0,
  createdAt: "2026-10-01T08:00:00.000Z",
  updatedAt: "2026-10-01T08:00:00.000Z"
});
const tasks = [
  task("t1", "Specifications 01", projects[0]),
  task("t2", "Specifications 02", projects[0]),
  task("t3", "Landing page", projects[1])
];

let n = 0;
/** A log of the day; a `null` id is a deleted project or task (its name kept). */
function log(
  p: [string | null, string] | null,
  t: [string | null, string] | null = null
): TimeLog {
  n += 1;
  return {
    id: `l${n}`,
    workDate: "2026-10-07",
    durationMinutes: 30,
    text: "Work",
    title: null,
    project: p ? { id: p[0], title: p[1], deleted: p[0] === null } : null,
    task: t ? { id: t[0], title: t[1], deleted: t[0] === null } : null,
    excludeFromStats: false
  } as TimeLog;
}

const savedLog: TimeLog = log(["p1", "Manhatan"], ["t1", "Specifications 01"]);

const res = (status: number) => new Response(null, { status });

/** The logs of each date; set per test. */
let dayLogs: Record<string, TimeLog[]> = {};

type GetOptions = {
  params?: {
    path?: Record<string, string>;
    query?: Record<string, unknown>;
  };
};

const KNOWN_GETS = [
  "/api/v1/me",
  "/api/v1/workdays/{date}",
  "/api/v1/projects",
  "/api/v1/tasks"
];

function routeGet() {
  api.GET.mockImplementation(async (path: string, options?: GetOptions) => {
    if (path === "/api/v1/me") return { data: me, response: res(200) };
    if (path === "/api/v1/workdays/{date}") {
      const date = options!.params!.path!.date;
      const logs = dayLogs[date] ?? [];
      return {
        data: {
          workDate: date,
          startMinute: 480,
          totalMinutes: logs.reduce((s, l) => s + l.durationMinutes, 0),
          logs
        },
        response: res(200)
      };
    }
    if (path === "/api/v1/projects") {
      return {
        data: { items: projects, total: 2, page: 1, pageSize: 100 },
        response: res(200)
      };
    }
    if (path === "/api/v1/tasks") {
      const projectId = options?.params?.query?.projectId;
      const q = String(options?.params?.query?.q ?? "").toLowerCase();
      const items = tasks.filter(
        (t) =>
          (!projectId || t.project.id === projectId) &&
          t.title.toLowerCase().includes(q)
      );
      return {
        data: { items, total: items.length, page: 1, pageSize: 100 },
        response: res(200)
      };
    }
    throw new Error(`unexpected GET ${path}`);
  });
}

function renderDialog() {
  const queryClient = createQueryClient();
  queryClient.setQueryData(["users", "me"], me);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const onOpenChange = vi.fn();
  render(
    <LogFormDialog open onOpenChange={onOpenChange} defaultDate="2026-10-07" />,
    { wrapper }
  );
  return { onOpenChange };
}

const input = (label: string | RegExp) =>
  screen.getByLabelText(label) as HTMLInputElement;
const projectField = () => input(/^Project/);
const taskField = () => input(/^Task/);

/** A chip's visible text, with the "·" spaced the same however the spans sit. */
const chipText = (b: HTMLElement) =>
  (b.textContent ?? "").replace(/\s*·\s*/g, " · ").trim();
const chips = (group: string) =>
  within(screen.getByRole("group", { name: group })).getAllByRole("button");
const chipNames = (group: string) => chips(group).map(chipText);
const chip = (group: string, text: string) =>
  chips(group).find((b) => chipText(b) === text)!;

const lastBody = () =>
  (api.POST.mock.lastCall?.[1] as { body: Record<string, unknown> }).body;

function fillAndSave() {
  fireEvent.change(input("Log text"), { target: { value: "Specs review" } });
  fireEvent.click(screen.getByRole("button", { name: "Log time" }));
}

const MANHATAN_THEN_WEBSITE = () => [
  log(["p1", "Manhatan"], ["t1", "Specifications 01"]),
  log(["p2", "Website"], ["t3", "Landing page"])
];

describe("Log time Recent chips (feat-tlog-recent-links)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-07T07:17:00.000Z"));
    Object.values(api).forEach((fn) => fn.mockReset());
    toast.success.mockReset();
    toast.error.mockReset();
    dayLogs = {};
    routeGet();
    api.POST.mockResolvedValue({ data: savedLog, response: res(201) });
    setLastLogLink(NO_LOG_LINK);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC-3 FR-TLOG-004 SCR-041: Recent projects and tasks from the day's logs, latest first; the prefilled ones pressed", async () => {
    dayLogs = { "2026-10-07": MANHATAN_THEN_WEBSITE() };
    setLastLogLink({
      project: { id: "p2", title: "Website" },
      task: {
        id: "t3",
        title: "Landing page",
        project: { id: "p2", title: "Website" }
      }
    });
    renderDialog();
    expect(
      await screen.findByRole("group", { name: "Recent projects" })
    ).toBeInTheDocument();
    expect(chipNames("Recent projects")).toEqual(["Website", "Manhatan"]);
    // A task is picked, so only its project's tasks are suggested.
    expect(chipNames("Recent tasks")).toEqual(["Landing page"]);
    expect(chip("Recent projects", "Website")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(chip("Recent projects", "Manhatan")).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(chip("Recent tasks", "Landing page")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("AC-4 FR-TLOG-004 SCR-041: two clicks: a project chip, then one of its task chips", async () => {
    dayLogs = { "2026-10-07": MANHATAN_THEN_WEBSITE() };
    setLastLogLink({
      project: { id: "p2", title: "Website" },
      task: {
        id: "t3",
        title: "Landing page",
        project: { id: "p2", title: "Website" }
      }
    });
    const { onOpenChange } = renderDialog();
    await screen.findByRole("group", { name: "Recent projects" });

    fireEvent.click(chip("Recent projects", "Manhatan"));
    await waitFor(() => expect(projectField().value).toBe("Manhatan"));
    expect(taskField().value).toBe("");
    expect(chipNames("Recent tasks")).toEqual(["Specifications 01"]);

    fireEvent.click(chip("Recent tasks", "Specifications 01"));
    await waitFor(() =>
      expect(taskField().value).toContain("Specifications 01")
    );
    expect(projectField().value).toBe("Manhatan");

    fillAndSave();
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(lastBody()).toMatchObject({ projectId: "p1", taskId: "t1" });
  });

  it("AC-5 FR-TLOG-004 SCR-041: with no project picked, task chips show their project and one picks the task and its project", async () => {
    dayLogs = { "2026-10-07": MANHATAN_THEN_WEBSITE() };
    const { onOpenChange } = renderDialog();
    await screen.findByRole("group", { name: "Recent tasks" });
    expect(chipNames("Recent tasks")).toEqual([
      "Landing page · Website",
      "Specifications 01 · Manhatan"
    ]);

    fireEvent.click(chip("Recent tasks", "Specifications 01 · Manhatan"));
    await waitFor(() => expect(projectField().value).toBe("Manhatan"));
    fillAndSave();
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(lastBody()).toMatchObject({ projectId: "p1", taskId: "t1" });
  });

  it("AC-5 FR-TLOG-004 SCR-041: no Recent rows for a day with only unsorted or deleted links", async () => {
    dayLogs = {
      "2026-10-07": [
        log(null),
        log([null, "Old client"]),
        log(["p1", "Manhatan"], [null, "Removed task"])
      ]
    };
    renderDialog();
    // The day has loaded once the one live project is suggested.
    expect(
      await screen.findByRole("group", { name: "Recent projects" })
    ).toBeInTheDocument();
    expect(chipNames("Recent projects")).toEqual(["Manhatan"]);
    expect(
      screen.queryByRole("group", { name: "Recent tasks" })
    ).not.toBeInTheDocument();
  });

  it("AC-5 FR-TLOG-004 SCR-041: no Recent rows for a day without logs", async () => {
    renderDialog();
    await waitFor(() =>
      expect(
        api.GET.mock.calls.some(([path]) => path === "/api/v1/workdays/{date}")
      ).toBe(true)
    );
    // Let the day's response render.
    await screen.findByLabelText("Log text");
    await new Promise((r) => setTimeout(r, 20));
    expect(
      screen.queryByRole("group", { name: "Recent projects" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: "Recent tasks" })
    ).not.toBeInTheDocument();
  });

  it("AC-6 FR-TLOG-004 SCR-041: the chips make no request of their own", async () => {
    dayLogs = { "2026-10-07": MANHATAN_THEN_WEBSITE() };
    renderDialog();
    await screen.findByRole("group", { name: "Recent projects" });
    fireEvent.click(chip("Recent projects", "Manhatan"));
    await waitFor(() => expect(projectField().value).toBe("Manhatan"));
    fireEvent.click(chip("Recent tasks", "Specifications 01"));
    await waitFor(() =>
      expect(taskField().value).toContain("Specifications 01")
    );

    for (const [path, options] of api.GET.mock.calls) {
      expect(KNOWN_GETS).toContain(path);
      if (path === "/api/v1/workdays/{date}")
        expect((options as GetOptions).params!.path!.date).toBe("2026-10-07");
    }
    expect(api.POST).not.toHaveBeenCalled();
    expect(api.PATCH).not.toHaveBeenCalled();
    expect(api.PUT).not.toHaveBeenCalled();
  });
});
