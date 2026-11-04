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

function problem(status: number, slug: string) {
  const body = {
    type: `https://pm4.angelovski.top/errors/${slug}`,
    title: "Error",
    status,
    detail: "Error."
  };
  return {
    error: body,
    response: new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/problem+json" }
    })
  };
}

/** The logs of each date; set per test. */
let dayLogs: Record<string, TimeLog[]> = {};

type GetOptions = {
  params?: {
    path?: Record<string, string>;
    query?: Record<string, unknown>;
  };
};

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

function renderDialog(log?: TimeLog) {
  const queryClient = createQueryClient();
  queryClient.setQueryData(["users", "me"], me);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const onOpenChange = vi.fn();
  render(
    <LogFormDialog
      open
      onOpenChange={onOpenChange}
      defaultDate="2026-10-07"
      log={log}
    />,
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
  (api.PATCH.mock.lastCall?.[1] as { body: Record<string, unknown> }).body;

describe("Edit log Recent chips (feat-tlog-recent-links D3, D4)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-07T07:17:00.000Z"));
    Object.values(api).forEach((fn) => fn.mockReset());
    toast.success.mockReset();
    toast.error.mockReset();
    routeGet();
    setLastLogLink(NO_LOG_LINK);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("Edit log of a deleted task: the chips show, and a task chip relinks the log", async () => {
    // The edited log is the day's last: Manhatan with a deleted task.
    const edited = log(["p1", "Manhatan"], [null, "Removed task"]);
    dayLogs = {
      "2026-10-07": [
        log(["p1", "Manhatan"], ["t1", "Specifications 01"]),
        log(["p2", "Website"], ["t3", "Landing page"]),
        edited
      ]
    };
    api.PATCH.mockResolvedValue({ data: savedLog, response: res(200) });
    const { onOpenChange } = renderDialog(edited);

    expect(
      await screen.findByRole("heading", { name: "Edit log" })
    ).toBeInTheDocument();
    await screen.findByRole("group", { name: "Recent projects" });
    expect(chipNames("Recent projects")).toEqual(["Manhatan", "Website"]);
    expect(chip("Recent projects", "Manhatan")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    // The deleted task isn't suggested; Manhatan's live task is.
    expect(chipNames("Recent tasks")).toEqual(["Specifications 01"]);
    expect(taskField().value).toBe("Removed task");

    fireEvent.click(chip("Recent tasks", "Specifications 01"));
    await waitFor(() =>
      expect(taskField().value).toContain("Specifications 01")
    );
    expect(chip("Recent tasks", "Specifications 01")).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(api.PATCH).toHaveBeenCalledTimes(1);
    expect(lastBody()).toMatchObject({ projectId: "p1", taskId: "t1" });
  });

  it("a project chip that clears the task also clears the task's error; one that keeps it keeps the error", async () => {
    dayLogs = {
      "2026-10-07": [
        log(["p2", "Website"], ["t3", "Landing page"]),
        log(["p1", "Manhatan"], ["t1", "Specifications 01"])
      ]
    };
    setLastLogLink({
      project: { id: "p1", title: "Manhatan" },
      task: {
        id: "t1",
        title: "Specifications 01",
        project: { id: "p1", title: "Manhatan" }
      }
    });
    api.POST.mockResolvedValue(problem(404, "not-found"));
    renderDialog();
    await screen.findByRole("group", { name: "Recent projects" });
    fireEvent.change(screen.getByLabelText("Log text"), {
      target: { value: "Specs review" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Log time" }));
    expect(
      await screen.findByText("This item no longer exists.")
    ).toBeInTheDocument();

    // The same project keeps the task, so the error stays.
    fireEvent.click(chip("Recent projects", "Manhatan"));
    expect(screen.getByText("This item no longer exists.")).toBeInTheDocument();

    // Another project clears the task and its error.
    fireEvent.click(chip("Recent projects", "Website"));
    await waitFor(() => expect(taskField().value).toBe(""));
    expect(
      screen.queryByText("This item no longer exists.")
    ).not.toBeInTheDocument();
  });
});
