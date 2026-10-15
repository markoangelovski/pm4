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
import type { TimeLog } from "../types";
import { LogFormDialog } from "./log-form-dialog";
import { LogTimeButton } from "./log-time-button";

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PATCH: vi.fn(),
  PUT: vi.fn()
}));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => nav,
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
  loggedMinutes: 0,
  createdAt: "2026-10-01T08:00:00.000Z",
  updatedAt: "2026-10-01T08:00:00.000Z"
});
const projects = [project("p1", "Manhatan"), project("p2", "Website")];

const task = (id: string, title: string, p: Project): Task => ({
  id,
  project: { id: p.id, title: p.title, deleted: false },
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

const editedLog: TimeLog = {
  id: "l1",
  workDate: "2026-10-07",
  durationMinutes: 75,
  text: "Specs review",
  title: "Review",
  project: { id: "p1", title: "Manhatan", deleted: false },
  task: { id: "t1", title: "Specifications 01", deleted: false },
  excludeFromStats: false
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

/** The day start of each date (null = no workday yet); set per test. */
let starts: Record<string, number | null> = {};

type GetOptions = {
  params?: {
    path?: Record<string, string>;
    query?: Record<string, unknown>;
  };
};

/** GET router: /me, the day of a date (from `starts`), the picker's projects and tasks (narrowed by projectId and a title-only q). */
function routeGet() {
  api.GET.mockImplementation(async (path: string, options?: GetOptions) => {
    if (path === "/api/v1/me") return { data: me, response: res(200) };
    if (path === "/api/v1/workdays/{date}") {
      const date = options!.params!.path!.date;
      return {
        data: {
          workDate: date,
          startMinute: starts[date] ?? null,
          totalMinutes: 0,
          logs: []
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
      // Like the API: `q` matches the task title only, never the project name.
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

function withProviders(ui: React.ReactElement) {
  const queryClient = createQueryClient();
  // The shell has loaded the signed-in user before any dialog opens.
  queryClient.setQueryData(["users", "me"], me);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(ui, { wrapper });
}

function renderDialog(props: { log?: TimeLog; defaultDate?: string } = {}) {
  const onOpenChange = vi.fn();
  const onSaved = vi.fn();
  const view = withProviders(
    <LogFormDialog
      open
      onOpenChange={onOpenChange}
      onSaved={onSaved}
      defaultDate={props.defaultDate ?? "2026-10-07"}
      log={props.log}
    />
  );
  return { onOpenChange, onSaved, unmount: view.unmount };
}

const input = (label: string | RegExp) =>
  screen.getByLabelText(label) as HTMLInputElement;
const change = (label: string | RegExp, value: string) =>
  fireEvent.change(input(label), { target: { value } });
const projectField = () => input(/^Project/);
const taskField = () => input(/^Task/);

function pick(option: HTMLElement) {
  fireEvent.pointerDown(option);
  fireEvent.mouseDown(option);
  fireEvent.pointerUp(option);
  fireEvent.mouseUp(option);
  fireEvent.click(option);
}

/** Types into a combobox, then opens its list (jsdom doesn't open it on input). */
function type(field: HTMLInputElement, text: string) {
  fireEvent.focus(field);
  fireEvent.change(field, { target: { value: text } });
  fireEvent.keyDown(field, { key: "ArrowDown" });
}

/** The ✕ button of a combobox. */
function clear(field: HTMLInputElement) {
  const button = field
    .closest('[data-slot="input-group"]')!
    .querySelector('[data-slot="combobox-clear"]') as HTMLElement;
  fireEvent.click(button);
}

/** Opens the Date popover and picks a day of the shown month (October 2026). */
async function pickDay(day: number) {
  fireEvent.click(screen.getByLabelText("Date"));
  const cell = await screen.findByRole("gridcell", { name: String(day) });
  fireEvent.click(cell.querySelector("button") ?? cell);
}

/** Opens the Day started at select and picks a time. */
async function pickStart(label: string) {
  fireEvent.click(screen.getByLabelText("Day started at"));
  pick(await screen.findByRole("option", { name: label }));
}

const submit = (name = "Log time") =>
  fireEvent.click(screen.getByRole("button", { name }));

const lastBody = (fn: typeof api.POST) =>
  (fn.mock.lastCall?.[1] as { body: Record<string, unknown> }).body;

const taskQueries = () =>
  api.GET.mock.calls
    .filter(([path]) => path === "/api/v1/tasks")
    .map(
      ([, options]) =>
        (options as GetOptions).params!.query as Record<string, unknown>
    );

describe("LogFormDialog (feat-tlog-web)", () => {
  beforeEach(() => {
    // "Now" is 2026-10-07 09:17 in Zagreb; only Date is faked, timers stay real.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-07T07:17:00.000Z"));
    Object.values(api).forEach((fn) => fn.mockReset());
    starts = { "2026-10-07": 480 };
    routeGet();
    nav.push.mockReset();
    nav.replace.mockReset();
    toast.success.mockReset();
    toast.error.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC-9 FR-TLOG-009 SCR-041: Day started at only while the date has no start: today prefilled to the quarter, a past date empty and required", async () => {
    starts = { "2026-10-07": null, "2026-10-06": null, "2026-10-05": 540 };
    api.POST.mockResolvedValue({ data: editedLog, response: res(201) });

    // Today without a start: shown, 09:17 → 09:15.
    const first = renderDialog();
    expect(await screen.findByLabelText("Day started at")).toHaveTextContent(
      "09:15"
    );

    // A past date without a start: empty, and required on submit.
    await pickDay(6);
    await waitFor(() =>
      expect(screen.getByLabelText("Date")).toHaveTextContent("6 Oct 2026")
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Day started at")).toHaveTextContent("HH:mm")
    );
    change("Log text", "Specs review");
    change("Duration", "30");
    submit();
    expect(
      await screen.findByText("Enter when you started working.")
    ).toBeInTheDocument();
    expect(api.POST).not.toHaveBeenCalled();

    await pickStart("09:00");
    submit();
    await waitFor(() => expect(api.POST).toHaveBeenCalledTimes(1));
    expect(lastBody(api.POST)).toMatchObject({
      workDate: "2026-10-06",
      dayStartMinute: 540
    });
    first.unmount();

    // A date with a start: no field, no dayStartMinute.
    renderDialog();
    await pickDay(5);
    await waitFor(() =>
      expect(screen.getByLabelText("Date")).toHaveTextContent("5 Oct 2026")
    );
    await waitFor(() =>
      expect(
        api.GET.mock.calls.some(
          ([path, options]) =>
            path === "/api/v1/workdays/{date}" &&
            (options as GetOptions).params!.path!.date === "2026-10-05"
        )
      ).toBe(true)
    );
    change("Log text", "Specs review");
    change("Duration", "30");
    submit();
    await waitFor(() => expect(api.POST).toHaveBeenCalledTimes(2));
    expect(screen.queryByLabelText("Day started at")).not.toBeInTheDocument();
    expect(lastBody(api.POST)).toMatchObject({ workDate: "2026-10-05" });
    expect(lastBody(api.POST)).not.toHaveProperty("dayStartMinute");
  });

  it("AC-10 FR-TLOG-004 FR-TLOG-010 FR-TLOG-018 SCR-041: text and duration validation, then POST with the parsed duration; Exclude from statistics", async () => {
    const first = renderDialog();
    expect(
      screen.getByRole("heading", { name: "Log time" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toHaveTextContent("7 Oct 2026");

    change("Duration", "20");
    submit();
    expect(
      await screen.findByText("Describe what you worked on.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Use 15-minute steps, from 15 min to 24 h.")
    ).toBeInTheDocument();
    expect(api.POST).not.toHaveBeenCalled();

    change("Log text", "Specs review");
    change("Duration", "1h 15m");
    await waitFor(() =>
      expect(screen.getByText("= 1h 15m")).toBeInTheDocument()
    );
    api.POST.mockResolvedValueOnce({ data: editedLog, response: res(201) });
    submit();
    await waitFor(() => expect(first.onOpenChange).toHaveBeenCalledWith(false));
    expect(api.POST).toHaveBeenCalledTimes(1);
    expect(api.POST).toHaveBeenCalledWith(
      "/api/v1/time-logs",
      expect.objectContaining({
        body: {
          workDate: "2026-10-07",
          durationMinutes: 75,
          text: "Specs review",
          title: null,
          projectId: null,
          taskId: null,
          excludeFromStats: false
        }
      })
    );
    expect(toast.success).toHaveBeenCalledWith("Log added");
    expect(first.onSaved).toHaveBeenCalledWith("2026-10-07");
    first.unmount();

    renderDialog();
    change("Log text", "Commute");
    change("Duration", "1");
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Exclude from statistics" })
    );
    api.POST.mockResolvedValueOnce({ data: editedLog, response: res(201) });
    submit();
    await waitFor(() => expect(api.POST).toHaveBeenCalledTimes(2));
    expect(lastBody(api.POST)).toMatchObject({
      durationMinutes: 60,
      excludeFromStats: true
    });
  });

  it("AC-11 FR-TLOG-004 FR-TLOG-006 SCR-041: the task fills and locks the project; clearing; narrowing by project; search by project name; every status", async () => {
    renderDialog();
    change("Log text", "Specs review");
    change("Duration", "30");

    // Typing a project's name lists its tasks.
    type(taskField(), "manh");
    expect(
      await screen.findByRole("option", {
        name: "Manhatan · Specifications 01"
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Manhatan · Specifications 02" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Website · Landing page" })
    ).not.toBeInTheDocument();

    // Picking the task fills and disables the project; both ids are sent.
    pick(screen.getByRole("option", { name: "Manhatan · Specifications 01" }));
    await waitFor(() => expect(projectField().value).toBe("Manhatan"));
    expect(projectField()).toBeDisabled();
    api.POST.mockResolvedValueOnce({ data: editedLog, response: res(201) });
    submit();
    await waitFor(() => expect(api.POST).toHaveBeenCalledTimes(1));
    expect(lastBody(api.POST)).toMatchObject({
      projectId: "p1",
      taskId: "t1"
    });

    // The task requests never filter by status.
    expect(taskQueries().length).toBeGreaterThan(0);
    for (const query of taskQueries()) {
      expect(query).not.toHaveProperty("status");
    }
  });

  it("AC-11 FR-TLOG-004 FR-TLOG-006 SCR-041: clearing the task frees the project, clearing the project clears the link, a project narrows the tasks", async () => {
    renderDialog();
    change("Log text", "Specs review");
    change("Duration", "30");

    // A project narrows the task request.
    type(projectField(), "Man");
    pick(await screen.findByRole("option", { name: "Manhatan" }));
    await waitFor(() => expect(projectField().value).toBe("Manhatan"));
    type(taskField(), "");
    await screen.findByRole("option", { name: "Manhatan · Specifications 02" });
    expect(taskQueries().at(-1)).toMatchObject({ projectId: "p1" });
    expect(
      screen.queryByRole("option", { name: "Website · Landing page" })
    ).not.toBeInTheDocument();

    pick(screen.getByRole("option", { name: "Manhatan · Specifications 02" }));
    await waitFor(() =>
      expect(taskField().value).toBe("Manhatan · Specifications 02")
    );
    expect(projectField()).toBeDisabled();

    // Clearing the task enables the project again (it keeps Manhatan).
    clear(taskField());
    await waitFor(() => expect(taskField().value).toBe(""));
    expect(projectField()).not.toBeDisabled();
    expect(projectField().value).toBe("Manhatan");

    // Clearing the project → no link at all.
    clear(projectField());
    await waitFor(() => expect(projectField().value).toBe(""));
    api.POST.mockResolvedValueOnce({ data: editedLog, response: res(201) });
    submit();
    await waitFor(() => expect(api.POST).toHaveBeenCalledTimes(1));
    expect(lastBody(api.POST)).toMatchObject({
      projectId: null,
      taskId: null
    });
  });

  it("AC-12 FR-TLOG-004 SCR-041: API field errors under the fields; 404 under Task; other failures → toast, the dialog stays", async () => {
    starts = { "2026-10-07": null };
    const { onOpenChange } = renderDialog();
    await screen.findByLabelText("Day started at");
    change("Log text", "Specs review");
    change("Duration", "30");

    api.POST.mockResolvedValueOnce(
      problem(400, "validation", [
        { field: "dayStartMinute", message: "The start isn't valid." },
        { field: "text", message: "The text is too long." },
        { field: "durationMinutes", message: "The duration isn't valid." }
      ])
    );
    submit();
    expect(
      await screen.findByText("The start isn't valid.")
    ).toBeInTheDocument();
    expect(screen.getByText("The text is too long.")).toBeInTheDocument();
    expect(screen.getByText("The duration isn't valid.")).toBeInTheDocument();

    // Fix the duration so the client check passes again, then a 404.
    change("Duration", "45");
    api.POST.mockResolvedValueOnce(problem(404, "not-found"));
    submit();
    expect(
      await screen.findByText("This item no longer exists.")
    ).toBeInTheDocument();

    api.POST.mockResolvedValueOnce({
      error: "Internal Server Error",
      response: res(500)
    });
    submit();
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't save the log.")
    );
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(
      screen.getByRole("heading", { name: "Log time" })
    ).toBeInTheDocument();
  });

  it("AC-13 FR-TLOG-008 SCR-041: edit starts with the log's values; only the text changed → no link in the PATCH; clearing the link sends nulls", async () => {
    const first = renderDialog({ log: editedLog });
    expect(
      screen.getByRole("heading", { name: "Edit log" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toHaveTextContent("7 Oct 2026");
    expect(input("Log text").value).toBe("Specs review");
    expect(input("Duration").value).toBe("1h 15m");
    expect(input(/^Title/).value).toBe("Review");
    await waitFor(() => expect(projectField().value).toBe("Manhatan"));
    expect(taskField().value).toBe("Manhatan · Specifications 01");

    change("Log text", "Specs review, round two");
    api.PATCH.mockResolvedValueOnce({ data: editedLog, response: res(200) });
    submit("Save");
    await waitFor(() => expect(first.onOpenChange).toHaveBeenCalledWith(false));
    expect(api.PATCH).toHaveBeenCalledWith(
      "/api/v1/time-logs/{id}",
      expect.objectContaining({
        params: { path: { id: "l1" } },
        body: {
          workDate: "2026-10-07",
          durationMinutes: 75,
          text: "Specs review, round two",
          title: "Review",
          excludeFromStats: false
        }
      })
    );
    expect(toast.success).toHaveBeenCalledWith("Log saved");
    first.unmount();

    renderDialog({ log: editedLog });
    await waitFor(() =>
      expect(taskField().value).toBe("Manhatan · Specifications 01")
    );
    clear(taskField());
    await waitFor(() => expect(projectField()).not.toBeDisabled());
    clear(projectField());
    await waitFor(() => expect(projectField().value).toBe(""));
    api.PATCH.mockResolvedValueOnce({ data: editedLog, response: res(200) });
    submit("Save");
    await waitFor(() => expect(api.PATCH).toHaveBeenCalledTimes(2));
    expect(lastBody(api.PATCH)).toMatchObject({
      projectId: null,
      taskId: null
    });
  });

  it("AC-14 FR-TLOG-014 SCR-041: a deleted project stays in its box with the marker until another is picked or the box is cleared", async () => {
    const orphan: TimeLog = {
      ...editedLog,
      project: { id: null, title: "Old site", deleted: true },
      task: null
    };
    const projectGroup = () =>
      projectField().closest('[data-slot="input-group"]') as HTMLElement;

    const textOnly = renderDialog({ log: orphan });
    await waitFor(() => expect(projectField().value).toBe("Old site"));
    expect(
      within(projectGroup()).getByRole("img", { name: "deleted" })
    ).toBeInTheDocument();
    change("Log text", "Old fixes");
    api.PATCH.mockResolvedValueOnce({ data: orphan, response: res(200) });
    submit("Save");
    await waitFor(() =>
      expect(textOnly.onOpenChange).toHaveBeenCalledWith(false)
    );
    expect(lastBody(api.PATCH)).not.toHaveProperty("projectId");
    expect(lastBody(api.PATCH)).not.toHaveProperty("taskId");
    textOnly.unmount();

    const cleared = renderDialog({ log: orphan });
    await waitFor(() => expect(projectField().value).toBe("Old site"));
    clear(projectField());
    await waitFor(() => expect(projectField().value).toBe(""));
    expect(
      within(projectGroup()).queryByRole("img", { name: "deleted" })
    ).toBeNull();
    api.PATCH.mockResolvedValueOnce({ data: orphan, response: res(200) });
    submit("Save");
    await waitFor(() => expect(api.PATCH).toHaveBeenCalledTimes(2));
    expect(lastBody(api.PATCH)).toMatchObject({
      projectId: null,
      taskId: null
    });
    cleared.unmount();

    renderDialog({ log: orphan });
    await waitFor(() => expect(projectField().value).toBe("Old site"));
    type(projectField(), "Man");
    pick(await screen.findByRole("option", { name: "Manhatan" }));
    await waitFor(() => expect(projectField().value).toBe("Manhatan"));
    api.PATCH.mockResolvedValueOnce({ data: orphan, response: res(200) });
    submit("Save");
    await waitFor(() => expect(api.PATCH).toHaveBeenCalledTimes(3));
    expect(lastBody(api.PATCH)).toMatchObject({
      projectId: "p1",
      taskId: null
    });
  });

  it("AC-14 FR-TLOG-011 SCR-041: the header Log time button opens the dialog for today; saving there doesn't navigate", async () => {
    withProviders(<LogTimeButton />);
    const button = screen.getByRole("button", { name: "Log time" });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(
      await screen.findByRole("heading", { name: "Log time" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toHaveTextContent("7 Oct 2026");

    change("Log text", "Specs review");
    change("Duration", "30");
    api.POST.mockResolvedValueOnce({ data: editedLog, response: res(201) });
    fireEvent.click(
      screen.getAllByRole("button", { name: "Log time" }).at(-1)!
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Log added")
    );
    expect(lastBody(api.POST)).toMatchObject({ workDate: "2026-10-07" });
    expect(nav.push).not.toHaveBeenCalled();
    expect(nav.replace).not.toHaveBeenCalled();
  });
});
