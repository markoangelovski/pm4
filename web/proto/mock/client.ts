// Mock API client of the UI prototype: the same surface as `lib/api/client` (an openapi-fetch client over
// `paths`), answered from the in-memory store. Its `fetch` never touches the network, and nothing patches
// `window.fetch`. Prototype twins of `features/<domain>/api.ts` import `apiClient` from here.
import createClient from "openapi-fetch";
import type { components, paths } from "@/lib/api/schema";
import type { TimeLog } from "@/proto/features/time/types";
import { getMockState, mock, nextId } from "./store";

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

function withCounts(p: Project): Project {
  const own = getMockState().tasks.filter((t) => t.project.id === p.id);
  const n = (s: Status) => own.filter((t) => t.status === s).length;
  return {
    ...p,
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
    mock.setProjects(all.filter((x) => x.id !== id));
    return noContent();
  }
  if (method === "PATCH") {
    const next = { ...p, ...body } as Project;
    mock.setProjects(all.map((x) => (x.id === id ? next : x)));
    return json(withCounts(next));
  }
  return json(withCounts(p));
}

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
      return json(t, 201);
    }
    const s = (q.get("q") ?? "").toLowerCase();
    const st = q.getAll("status");
    const list = all.filter(
      (t) =>
        t.title.toLowerCase().includes(s) &&
        (!q.get("projectId") || t.project.id === q.get("projectId")) &&
        (st.length === 0 || st.includes(t.status))
    );
    return json(paged(list, q));
  }
  const t = all.find((x) => x.id === id);
  if (!t) return notFound();
  if (method === "DELETE") {
    mock.setTasks(all.filter((x) => x.id !== id));
    return noContent();
  }
  if (method === "PATCH") {
    const next = { ...t, ...body } as Task;
    mock.setTasks(all.map((x) => (x.id === id ? next : x)));
    return json(next);
  }
  return json(t);
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
  if (method === "PUT") {
    mock.setStart(date, Number(body.startMinute));
    return json({ workDate: date, startMinute: Number(body.startMinute) });
  }
  return json(dayOf(date));
}

function timeLogs(method: string, id: string | undefined, body: Body) {
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
    mock.updateLog(id, {
      ...old,
      ...toLog(),
      workDate: String(body.workDate ?? old.workDate)
    });
    return json(getMockState().logs.find((l) => l.id === id));
  }
  if (method === "DELETE") {
    mock.deleteLog(id);
    return noContent();
  }
  return json(old);
}

/** Answers one API request from the store. */
function handle(
  method: string,
  path: string,
  q: URLSearchParams,
  body: Body
): Response {
  const [res, id] = path.replace(/^\/api\/v1\//, "").split("/");
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
      return timeLogs(method, id, body);
  }
  return problem(
    501,
    "Not mocked",
    `${method} ${path} is not mocked in the prototype`
  );
}

async function mockFetch(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const text =
    request.method === "GET" || request.method === "DELETE"
      ? ""
      : await request.text();
  const body = text ? (JSON.parse(text) as Body) : {};
  await new Promise((r) => setTimeout(r, MOCK_LATENCY_MS));
  return handle(request.method, url.pathname, url.searchParams, body);
}

/** Same surface as `apiClient` in `lib/api/client`; the base URL is never requested. */
export const apiClient = createClient<paths>({
  baseUrl: "http://proto.localhost",
  fetch: mockFetch
});
