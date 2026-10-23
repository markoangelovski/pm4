// Mock API client of the UI prototype: the same surface as `lib/api/client` (an openapi-fetch client over
// `paths`), answered from the in-memory store. Its `fetch` never touches the network, and nothing patches
// `window.fetch`. Prototype twins of `features/<domain>/api.ts` import `apiClient` from here.
import createClient from "openapi-fetch";
import type { components, paths } from "@/lib/api/schema";
import type { TimeLog } from "@/proto/features/time/types";
import type {
  BookingLogResponseDto,
  SetBookingsDto
} from "@/proto/features/bookings/proposed-types";
import type {
  PmspaCandidatesInputDto,
  PmspaImportDto,
  PmspaImportSelectionDto,
  PmspaLinkType,
  PmspaPushDto,
  PmspaPushTargetDto,
  PmspaSyncDto,
  PmspaSyncTargetDto,
  SavePmspaConnectionDto
} from "@/proto/features/integrations/types";
import { formatDuration, today } from "@/lib/time";
import { getMockState, mock, nextId } from "./store";
import * as pmspa from "./pmspa";

/** Every mock response waits this long, so loading states show. */
export const MOCK_LATENCY_MS = 150;

type Project = components["schemas"]["ProjectResponseDto"];
type Task = components["schemas"]["TaskResponseDto"];
type Status = components["schemas"]["TaskStatus"];
type Body = Record<string, unknown>;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
const noContent = () => new Response(null, { status: 204 });
const problem = (status: number, title: string, detail: string) =>
  new Response(JSON.stringify({ type: "about:blank", title, status, detail }), {
    status,
    headers: { "Content-Type": "application/problem+json" }
  });
const notFound = () =>
  problem(404, "Not Found", "Not found in the prototype mock");

function paged<T>(items: T[], q: URLSearchParams) {
  const page = Number(q.get("page") ?? 1);
  const pageSize = Number(q.get("pageSize") ?? 20);
  return {
    page,
    pageSize,
    total: items.length,
    items: items.slice((page - 1) * pageSize, page * pageSize)
  };
}

const sumMinutes = (logs: TimeLog[]) =>
  logs.reduce((t, l) => t + l.durationMinutes, 0);

/** API-PRJ-002/003: the task counts and the logged minutes (the project's logs, its tasks' included). */
function withCounts(p: Project) {
  const s = getMockState();
  const own = s.tasks.filter((t) => t.project.id === p.id);
  const n = (st: Status) => own.filter((t) => t.status === st).length;
  return {
    ...p,
    loggedMinutes: sumMinutes(s.logs.filter((l) => l.project?.id === p.id)),
    taskCounts: {
      upcoming: n("upcoming"),
      inProgress: n("in-progress"),
      completed: n("completed"),
      total: own.length
    }
  };
}

function dayOf(date: string) {
  const s = getMockState();
  const logs = s.logs.filter((l) => l.workDate === date);
  return {
    workDate: date,
    startMinute: s.starts[date] ?? null,
    totalMinutes: logs.reduce((t, l) => t + l.durationMinutes, 0),
    logs
  };
}

function projects(
  method: string,
  id: string | undefined,
  q: URLSearchParams,
  body: Body
) {
  const all = getMockState().projects;
  if (!id) {
    if (method === "POST") {
      const p = {
        ...all[0],
        ...body,
        id: nextId("p-new"),
        projectLead: all[0].projectLead
      } as Project;
      mock.setProjects([...all, p]);
      return json(withCounts(p), 201);
    }
    const s = (q.get("q") ?? "").toLowerCase();
    return json(
      paged(
        all.filter((p) => p.title.toLowerCase().includes(s)).map(withCounts),
        q
      )
    );
  }
  const p = all.find((x) => x.id === id);
  if (!p) return notFound();
  if (method === "DELETE") {
    const taskIds = getMockState()
      .tasks.filter((t) => t.project.id === id)
      .map((t) => t.id);
    mock.deleteProject(id);
    pmspa.deleted("project", [id]);
    pmspa.deleted("task", taskIds);
    return noContent();
  }
  if (method === "PATCH") {
    pmspa.touched("project", id);
    const next = { ...p, ...body } as Project;
    mock.setProjects(all.map((x) => (x.id === id ? next : x)));
    return json(withCounts(next));
  }
  return json(withCounts(p));
}

/** API-TSK-002/003: the task plus its logged minutes. */
const withLogged = (t: Task) => ({
  ...t,
  loggedMinutes: sumMinutes(
    getMockState().logs.filter((l) => l.task?.id === t.id)
  )
});

function tasks(
  method: string,
  id: string | undefined,
  q: URLSearchParams,
  body: Body
) {
  const { tasks: all, projects: ps } = getMockState();
  if (!id) {
    if (method === "POST") {
      const project = ps.find((p) => p.id === body.projectId) ?? ps[0];
      const t = {
        ...all[0],
        ...body,
        id: nextId("t-new"),
        project: { id: project.id, title: project.title, deleted: false }
      } as Task;
      mock.setTasks([...all, t]);
      return json(withLogged(t), 201);
    }
    const s = (q.get("q") ?? "").toLowerCase();
    const st = q.getAll("status");
    const list = all.filter(
      (t) =>
        t.title.toLowerCase().includes(s) &&
        (!q.get("projectId") || t.project.id === q.get("projectId")) &&
        (st.length === 0 || st.includes(t.status))
    );
    return json(paged(list.map(withLogged), q));
  }
  const t = all.find((x) => x.id === id);
  if (!t) return notFound();
  if (method === "DELETE") {
    mock.deleteTask(id);
    pmspa.deleted("task", [id]);
    return noContent();
  }
  if (method === "PATCH") {
    pmspa.touched("task", id);
    const next = { ...t, ...body } as Task;
    mock.setTasks(all.map((x) => (x.id === id ? next : x)));
    return json(withLogged(next));
  }
  return json(withLogged(t));
}

function workdays(
  method: string,
  date: string | undefined,
  q: URLSearchParams,
  body: Body
) {
  if (!date) {
    const from = q.get("from") ?? "";
    const to = q.get("to") ?? "9999";
    const items = [...new Set(getMockState().logs.map((l) => l.workDate))]
      .filter((d) => d >= from && d <= to)
      .map((d) => ({
        workDate: d,
        startMinute: dayOf(d).startMinute ?? 0,
        totalMinutes: dayOf(d).totalMinutes
      }));
    return json({ items });
  }
  if (method === "DELETE") {
    const s = getMockState();
    if (
      s.starts[date] === undefined &&
      !s.logs.some((l) => l.workDate === date)
    )
      return notFound();
    mock.deleteDay(date);
    return noContent();
  }
  if (method === "PUT") {
    mock.setStart(date, Number(body.startMinute));
    return json({ workDate: date, startMinute: Number(body.startMinute) });
  }
  return json(dayOf(date));
}

/** Only logs of a project (or task) that aren't excluded from statistics can be booked. */
const isBookable = (l: TimeLog) => !l.excludeFromStats && l.project !== null;

/** A log with its bookings (API-BOOK-001 / API-TLOG-001 items). */
function withBooking(l: TimeLog): BookingLogResponseDto {
  const b = getMockState().bookings[l.id];
  return { ...l, bookings: isBookable(l) && b ? b : [] };
}

/** Minutes of the log booked to any date. */
const bookedOf = (l: TimeLog) =>
  withBooking(l).bookings.reduce((t, b) => t + b.minutes, 0);

const validation = (field: string, message: string) =>
  new Response(
    JSON.stringify({
      type: "https://pm4.angelovski.top/errors/validation",
      title: "Validation failed",
      status: 400,
      detail: "Validation failed",
      errors: [{ field, message }]
    }),
    { status: 400, headers: { "Content-Type": "application/problem+json" } }
  );

/** API-TLOG-001: one project's (its tasks' included) or one task's logs, newest date first. */
function listLogs(q: URLSearchParams) {
  const projectId = q.get("projectId");
  const taskId = q.get("taskId");
  if (!projectId === !taskId)
    return problem(
      400,
      "Bad Request",
      "Pass exactly one of projectId, taskId."
    );
  const s = getMockState();
  const all = s.logs
    .map((l, i) => ({ l, i }))
    .filter(({ l }) =>
      taskId ? l.task?.id === taskId : l.project?.id === projectId
    )
    .sort((a, b) =>
      a.l.workDate === b.l.workDate
        ? a.i - b.i
        : a.l.workDate < b.l.workDate
          ? 1
          : -1
    )
    .map(({ l }) => withBooking(l));
  return json({
    ...paged(all, q),
    totalMinutes: sumMinutes(all),
    bookedMinutes: all.reduce((t, l) => t + bookedOf(l), 0)
  });
}

function timeLogs(
  method: string,
  id: string | undefined,
  q: URLSearchParams,
  body: Body
) {
  if (method === "GET" && !id) return listLogs(q);
  const s = getMockState();
  const task = s.tasks.find((t) => t.id === body.taskId);
  const project = task
    ? task.project
    : (s.projects.find((p) => p.id === body.projectId) ?? null);
  const toLog = (): Omit<TimeLog, "id"> => ({
    workDate: String(body.workDate),
    durationMinutes: Number(body.durationMinutes),
    text: String(body.text ?? ""),
    title: (body.title as string | null) ?? null,
    excludeFromStats: Boolean(body.excludeFromStats),
    project: project
      ? { id: project.id, title: project.title, deleted: false }
      : null,
    task: task ? { id: task.id, title: task.title, deleted: false } : null
  });
  if (method === "POST" && !id) {
    return json(
      mock.addLog(toLog(), body.dayStartMinute as number | undefined),
      201
    );
  }
  const old = s.logs.find((l) => l.id === id);
  if (!id || !old) return notFound();
  if (method === "PATCH") {
    // API-TLOG-004: without projectId/taskId the link (or the deleted names) stays.
    const { project, task, ...fields } = toLog();
    const relink = "projectId" in body || "taskId" in body;
    // Partial bookings: a log can't get shorter than its booked time (unless the change makes it unbookable).
    const next = { ...old, ...fields, ...(relink ? { project, task } : {}) };
    const booked = bookedOf(old);
    if (isBookable(next) && next.durationMinutes < booked)
      return validation(
        "durationMinutes",
        `${formatDuration(booked)} of this log is booked. Remove bookings first, or keep at least ${formatDuration(booked)}.`
      );
    pmspa.touched("time-log", id);
    mock.updateLog(id, {
      ...old,
      ...fields,
      ...(relink ? { project, task } : {}),
      workDate: String(body.workDate ?? old.workDate)
    });
    return json(getMockState().logs.find((l) => l.id === id));
  }
  if (method === "DELETE") {
    mock.deleteLog(id);
    pmspa.deleted("time-log", [id]);
    return noContent();
  }
  return json(old);
}

const byDateThenId = (a: TimeLog, b: TimeLog) =>
  a.workDate === b.workDate
    ? a.id.localeCompare(b.id)
    : a.workDate < b.workDate
      ? -1
      : 1;

/** API-BOOK-001 (GET) and API-BOOK-002 (PUT: replaces each listed log's bookings). */
function bookings(method: string, q: URLSearchParams, body: Body) {
  const s = getMockState();
  if (method === "PUT") {
    const input = (body as unknown as SetBookingsDto).logs ?? [];
    const logs = input.map((i) => s.logs.find((l) => l.id === i.logId));
    if (logs.some((l) => !l))
      return problem(404, "Not Found", "Time log not found.");
    const todayStr = today(s.me.timeZone);
    for (const [n, { bookings: list }] of input.entries()) {
      const log = logs[n]!;
      if (list.length && !isBookable(log))
        return validation("logs", "logs contains a log that can't be booked.");
      if (list.some((b) => b.date > todayStr))
        return validation("logs", "A booking date is in the future.");
      if (new Set(list.map((b) => b.date)).size !== list.length)
        return validation("logs", "One booking per date and log.");
      if (list.some((b) => b.minutes < 15 || b.minutes % 15 !== 0))
        return validation("logs", "Booking times use 15-minute steps.");
      if (list.reduce((t, b) => t + b.minutes, 0) > log.durationMinutes)
        return validation("logs", "The bookings are longer than the log.");
    }
    mock.setBookings(
      input.map((i) => ({
        logId: i.logId,
        bookings: [...i.bookings].sort((a, b) => a.date.localeCompare(b.date))
      }))
    );
    return json({
      items: logs
        .map((l) => withBooking(l!))
        .sort((a, b) => a.id.localeCompare(b.id))
    });
  }
  const from = q.get("from") ?? "";
  const to = q.get("to") ?? "";
  const items = s.logs
    .map(withBooking)
    .filter(
      (l) =>
        (l.workDate >= from && l.workDate <= to) ||
        l.bookings.some((b) => b.date >= from && b.date <= to)
    )
    .sort(byDateThenId);
  return json({ items });
}

/** API-RPT-001: worked and booked minutes per day and per project of the range. */
function dashboard(q: URLSearchParams) {
  const s = getMockState();
  const from = q.get("from") ?? "";
  const to = q.get("to") ?? "";
  const inRange = (d: string) => d >= from && d <= to;
  const logs = s.logs.filter((l) => inRange(l.workDate)).map(withBooking);
  const dates = [
    ...new Set([
      ...Object.keys(s.starts).filter(inRange),
      ...logs.map((l) => l.workDate)
    ])
  ].sort();
  const days = dates.map((workDate) => {
    const own = logs.filter((l) => l.workDate === workDate);
    return {
      workDate,
      startMinute: s.starts[workDate] ?? null,
      workedMinutes: sumMinutes(own),
      bookedMinutes: own.reduce((t, l) => t + bookedOf(l), 0)
    };
  });
  type Row = {
    kind: "project" | "unsorted" | "nonprod";
    project: TimeLog["project"];
    workedMinutes: number;
    bookedMinutes: number;
  };
  const rows = new Map<string, Row>();
  for (const l of logs) {
    const kind = l.excludeFromStats
      ? "nonprod"
      : l.project
        ? "project"
        : "unsorted";
    const key =
      kind === "project"
        ? (l.project!.id ?? `deleted:${l.project!.title}`)
        : kind;
    const row = rows.get(key) ?? {
      kind,
      project: kind === "project" ? l.project : null,
      workedMinutes: 0,
      bookedMinutes: 0
    };
    row.workedMinutes += l.durationMinutes;
    if (kind === "project") row.bookedMinutes += bookedOf(l);
    rows.set(key, row);
  }
  const all = [...rows.values()];
  const projects = [
    ...all
      .filter((r) => r.kind === "project")
      .sort(
        (a, b) =>
          b.workedMinutes - a.workedMinutes ||
          a.project!.title.localeCompare(b.project!.title)
      ),
    ...all.filter((r) => r.kind === "unsorted"),
    ...all.filter((r) => r.kind === "nonprod")
  ];
  return json({ days, projects });
}

const notConnected = () =>
  problem(409, "Conflict", "PMSPA isn't connected (pmspa-not-connected).");

/** `/integrations/pmspa/**` (req-integrations, types.ts). */
function integrations(
  method: string,
  rest: string[],
  q: URLSearchParams,
  body: Body
) {
  const [name, sub, a, b] = rest;
  if (name !== "pmspa") return notFound();
  if (!sub) {
    if (method === "DELETE") {
      pmspa.disconnect();
      return noContent();
    }
    if (method === "PUT") {
      const input = body as unknown as SavePmspaConnectionDto;
      const urlError = pmspa.urlProblem(input.url);
      if (urlError)
        return new Response(
          JSON.stringify({
            type: "https://pm4.angelovski.top/errors/validation",
            title: "Validation failed",
            status: 400,
            detail: "Validation failed",
            errors: [{ field: "url", message: urlError }]
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/problem+json" }
          }
        );
      const saved = pmspa.saveConnection(input);
      if ("slug" in saved)
        return new Response(
          JSON.stringify({
            type: "https://pm4.angelovski.top/errors/pmspa-account-switch",
            title: "Different PMSPA account",
            status: 409,
            detail: "The credentials log in as a different PMSPA account.",
            linkCount: saved.linkCount,
            accountEmail: saved.accountEmail
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/problem+json" }
          }
        );
      return json(saved);
    }
    return json(pmspa.connectionDto());
  }
  if (sub === "test") {
    const c = pmspa.testConnection();
    return c ? json(c) : notFound();
  }
  if (sub === "links") {
    if (method === "DELETE")
      return pmspa.unlink(a as PmspaLinkType, b) ? noContent() : notFound();
    if (a && b) {
      if (!pmspa.isConnected()) return notConnected();
      const detail = pmspa.linkDetail(a as PmspaLinkType, b);
      return detail ? json(detail) : notFound();
    }
    return json({ items: pmspa.activeLinks(q.get("type") as PmspaLinkType) });
  }
  if (!pmspa.isConnected()) return notConnected();
  if (sub === "projects") {
    if (!a) return json({ items: pmspa.listProjects() });
    return json({ items: pmspa.listTasks(a) });
  }
  if (sub === "tasks") return json({ items: pmspa.listAllTasks() });
  if (sub === "days" && a === "details")
    return json({ items: pmspa.listDayDetails(q.getAll("dates")) });
  if (sub === "days")
    return json({
      items: pmspa.listDays(q.get("from") ?? "", q.get("to") ?? "")
    });
  if (sub === "import" && a === "preview") {
    const selection = body as unknown as PmspaImportSelectionDto;
    return json({
      items: pmspa.importPreview(selection),
      days: pmspa.listDayDetails(selection.dates ?? [])
    });
  }
  if (sub === "import") {
    const input = body as unknown as PmspaImportDto;
    const out = pmspa.runImport(input.selection, input.choices);
    return json({
      ...out,
      days: pmspa.listDayDetails(input.selection.dates ?? [])
    });
  }
  if (sub === "candidates")
    return json({
      items: pmspa.listCandidates(body as unknown as PmspaCandidatesInputDto)
    });
  if (sub === "sync" && a === "preview") {
    const items = pmspa.pushPreview(body as unknown as PmspaSyncTargetDto);
    return items ? json({ items }) : notFound();
  }
  if (sub === "sync") {
    const input = body as unknown as PmspaSyncDto;
    const out = pmspa.runPush(input.target, input.choices);
    return out ? json(out) : notFound();
  }
  if (sub === "push" && a === "preview") {
    const items = pmspa.pushPreview(body as unknown as PmspaPushTargetDto);
    return items ? json({ items }) : notFound();
  }
  if (sub === "push") {
    const input = body as unknown as PmspaPushDto;
    const out = pmspa.runPush(input.target, input.choices);
    return out ? json(out) : notFound();
  }
  return notFound();
}

/** Answers one API request from the store. */
function handle(
  method: string,
  path: string,
  q: URLSearchParams,
  body: Body
): Response {
  const [res, id, ...rest] = path.replace(/^\/api\/v1\//, "").split("/");
  switch (res) {
    case "auth":
      return noContent();
    case "version":
      return json({ version: "proto" });
    case "me":
      if (method === "PATCH") mock.updateMe(body);
      return json(getMockState().me);
    case "users": {
      const me = getMockState().me;
      const s = (q.get("q") ?? "").toLowerCase();
      const u = {
        id: me.id,
        displayName: me.displayName,
        email: me.email,
        avatarUrl: null
      };
      return json({
        items: !s || u.displayName.toLowerCase().includes(s) ? [u] : []
      });
    }
    case "projects":
      return projects(method, id, q, body);
    case "tasks":
      return tasks(method, id, q, body);
    case "workdays":
      return workdays(method, id, q, body);
    case "time-logs":
      return timeLogs(method, id, q, body);
    case "bookings":
      return bookings(method, q, body);
    case "integrations":
      return integrations(method, [id, ...rest], q, body);
    case "reports":
      return id === "dashboard" ? dashboard(q) : notFound();
  }
  return problem(
    501,
    "Not mocked",
    `${method} ${path} is not mocked in the prototype`
  );
}

/** Calls that make PM4's API call PMSPA (the connection reads and the flags' link lists don't). */
function reachesPmspa(method: string, path: string): boolean {
  const m = /\/integrations\/pmspa(?:\/(.*))?$/.exec(path);
  if (!m) return false;
  const sub = m[1] ?? "";
  if (sub === "") return method === "PUT";
  if (sub === "links") return false;
  if (sub.startsWith("links/")) return method === "GET";
  return true;
}

/** Roughly how many PMSPA requests a call makes (list pages, a read per day, a write per record). */
function pmspaCost(method: string, url: URL, body: Body): number {
  const path = url.pathname;
  if (path.endsWith("/candidates"))
    return pmspa.candidatesCost(body as unknown as PmspaCandidatesInputDto);
  if (path.endsWith("/sync/preview") || path.endsWith("/push/preview"))
    return pmspa.previewCost(
      body as unknown as PmspaSyncTargetDto | PmspaPushTargetDto
    );
  if (path.endsWith("/integrations/pmspa") || path.endsWith("/test")) return 2;
  if (path.endsWith("/days")) return 1;
  if (path.endsWith("/days/details"))
    return pmspa.dayDetailsCost(url.searchParams.getAll("dates"));
  if (path.endsWith("/pmspa/tasks"))
    return Math.max(1, Math.ceil(pmspa.listAllTasks().length / 50));
  const projectTasks = /\/pmspa\/projects\/([^/]+)\/tasks$/.exec(path);
  if (projectTasks)
    return Math.max(1, Math.ceil(pmspa.listTasks(projectTasks[1]).length / 50));
  if (method === "POST") return path.endsWith("/preview") ? 4 : 6;
  return 1;
}

async function mockFetch(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const text =
    request.method === "GET" || request.method === "DELETE"
      ? ""
      : await request.text();
  const body = text ? (JSON.parse(text) as Body) : {};
  // The prototype shell's "another one running" switch: the API turns the next commit away on its lock,
  // before it calls PMSPA or writes anything (so ahead of the rate limit).
  if (
    request.method === "POST" &&
    /\/integrations\/pmspa\/(import|sync|push)$/.test(url.pathname) &&
    pmspa.isConnected() &&
    pmspa.takeSyncRunning()
  ) {
    await new Promise((r) => setTimeout(r, MOCK_LATENCY_MS));
    return new Response(
      JSON.stringify({
        type: "https://pm4.angelovski.top/errors/pmspa-sync-running",
        title: "Conflict",
        status: 409,
        detail: "Another import, sync or push is still running."
      }),
      { status: 409, headers: { "Content-Type": "application/problem+json" } }
    );
  }
  const cost = reachesPmspa(request.method, url.pathname)
    ? pmspaCost(request.method, url, body)
    : 0;
  const wake = cost > 0 ? pmspa.wakeDelay() : 0;
  await new Promise((r) => setTimeout(r, MOCK_LATENCY_MS + wake));
  if (cost > 0 && (pmspa.isConnected() || request.method === "PUT")) {
    const retryAfterSeconds = pmspa.spendRequests(cost);
    if (retryAfterSeconds > 0)
      return new Response(
        JSON.stringify({
          type: "https://pm4.angelovski.top/errors/pmspa-rate-limited",
          title: "PMSPA is busy",
          status: 503,
          detail: "PMSPA is busy. Try again later.",
          retryAfterSeconds
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/problem+json" }
        }
      );
  }
  return handle(request.method, url.pathname, url.searchParams, body);
}

/** Same surface as `apiClient` in `lib/api/client`; the base URL is never requested. */
export const apiClient = createClient<paths>({
  baseUrl: "http://proto.localhost",
  fetch: mockFetch
});
