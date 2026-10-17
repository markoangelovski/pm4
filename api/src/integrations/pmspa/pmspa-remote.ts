import { Injectable } from "@nestjs/common";
import { PmspaClient } from "./pmspa-client.js";
import type { PmspaColumn, RemoteProject, RemoteTask } from "./pmspa-fields.js";
import { pmspaProblems } from "./pmspa-problems.js";
import type { PmspaResponse } from "./pmspa-transport.js";

// The PMSPA projects and tasks, one method per PMSPA call (feat-int-sync-api API-INT-005/006/012…016,
// endpoints.md *Shared PMSPA shapes*). Reads answer 404 as "not there"; writes fail with PmspaWriteError (D10).

/** Rows per list page (`limit`). */
const PAGE = 50;

/** A PMSPA write rejected with 4xx/5xx. The message is D10's reason. */
export class PmspaWriteError extends Error {}

export interface PmspaProjectWrite {
  title: string;
  description: string | null;
  pl: string | null;
  kanboard: string | null;
}

export interface PmspaTaskWrite extends PmspaProjectWrite {
  column: PmspaColumn;
  done: boolean;
  /** Epoch ms digits (D7), or null when the task has no due date. */
  dueAt: string | null;
}

/** A log of a PMSPA event (feat-int-time-api). */
export interface RemoteLog {
  id: string;
  title: string;
  /** Hours. */
  duration: number;
}

/** A PMSPA event with its logs. */
export interface RemoteEvent {
  id: string;
  dayId: string;
  date: string;
  title: string;
  taskId: string | null;
  booked: boolean;
  logs: RemoteLog[];
}

/** A PMSPA day: `start` is a decimal hour. */
export interface RemoteDay {
  id: string;
  date: string;
  start: number | null;
  events: RemoteEvent[];
}

type Json = Record<string, unknown>;

const isRecord = (v: unknown): v is Json =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const text = (v: unknown): string | null => (typeof v === "string" ? v : null);

function toProject(raw: Json): RemoteProject {
  return {
    id: String(raw._id),
    userId: String(raw.owner),
    title: text(raw.title) ?? "",
    description: text(raw.description),
    pl: text(raw.pl),
    kanboard: text(raw.kanboard),
    done: raw.done === true,
    taskCount:
      Number(raw.openTasksCount ?? 0) + Number(raw.closedTasksCount ?? 0)
  };
}

function toTask(raw: Json): RemoteTask {
  return {
    id: String(raw._id),
    projectId: String(raw.project),
    title: text(raw.title) ?? "",
    description: text(raw.description),
    column: raw.column as PmspaColumn,
    pl: text(raw.pl),
    kanboard: text(raw.kanboard),
    dueAt: Number(raw.dueDate ?? 0)
  };
}

/** D10: `PMSPA rejected it: <message> (<error>)`, or the status when PMSPA sent no message. */
function rejection(res: PmspaResponse): PmspaWriteError {
  const body = isRecord(res.body) ? res.body : null;
  if (body && typeof body.message === "string") {
    const error = typeof body.error === "string" ? ` (${body.error})` : "";
    return new PmspaWriteError(`PMSPA rejected it: ${body.message}${error}`);
  }
  return new PmspaWriteError(`PMSPA rejected it: HTTP ${res.status}`);
}

/** The `[propName, propValue]` pairs PMSPA stores: null and empty values are left out. */
function present(
  fields: Record<string, string | null | undefined>
): [string, string][] {
  return Object.entries(fields).filter(
    (e): e is [string, string] => typeof e[1] === "string" && e[1] !== ""
  );
}

const projectFields = (f: PmspaProjectWrite) => ({
  title: f.title,
  description: f.description,
  pl: f.pl,
  kanboard: f.kanboard
});

const taskFields = (f: PmspaTaskWrite) => ({
  ...projectFields(f),
  column: f.column,
  done: f.done ? "true" : "false",
  dueDate: f.dueAt
});

/** A PMSPA log as `days` returns it: hours. */
function toLog(raw: Json): RemoteLog {
  return {
    id: String(raw._id),
    title: text(raw.title) ?? "",
    duration: Number(raw.duration ?? 0)
  };
}

/** A PMSPA day with its events populated (the one-day form). */
function toDay(raw: Json): RemoteDay {
  const id = String(raw._id);
  const date = text(raw.day) ?? "";
  const events = Array.isArray(raw.events) ? raw.events.filter(isRecord) : [];
  return {
    id,
    date,
    start: typeof raw.start === "number" ? raw.start : null,
    events: events.map((e): RemoteEvent => ({
      id: String(e._id),
      dayId: id,
      date,
      title: text(e.title) ?? "",
      taskId: text(e.task),
      booked: e.booked === true,
      logs: (Array.isArray(e.logs) ? e.logs.filter(isRecord) : []).map(toLog)
    }))
  };
}

@Injectable()
export class PmspaRemote {
  constructor(private readonly client: PmspaClient) {}

  /** A read: 404 → null (the caller decides what that means), other non-2xx → pmspa-error. */
  private async read(
    userId: string,
    path: string,
    query?: Record<string, string>
  ): Promise<Json | null> {
    const res = await this.client.request(userId, {
      method: "GET",
      path,
      query
    });
    if (res.status === 404) return null;
    if (res.status < 200 || res.status > 299) throw pmspaProblems.error();
    return isRecord(res.body) ? res.body : {};
  }

  /** Every page of a list: `stats.remaining` says whether another page follows. 404 → []. */
  private async pages(
    userId: string,
    path: string,
    key: string,
    query: Record<string, string> = {}
  ): Promise<Json[]> {
    const items: Json[] = [];
    let skip = 0;
    for (;;) {
      const body = await this.read(userId, path, {
        ...query,
        skip: String(skip),
        limit: String(PAGE)
      });
      if (!body) return items;
      const page = Array.isArray(body[key]) ? (body[key] as Json[]) : [];
      items.push(...page);
      const stats = isRecord(body.stats) ? body.stats : {};
      const remaining =
        typeof stats.remaining === "number" ? stats.remaining : 0;
      if (remaining <= 0 || page.length === 0) return items;
      skip += page.length;
    }
  }

  /** A write: any non-2xx → PmspaWriteError (PMSPA answers 201 to some updates). */
  private async write(
    userId: string,
    method: "POST" | "PATCH" | "DELETE",
    path: string,
    body?: unknown
  ): Promise<Json> {
    const res = await this.client.request(userId, { method, path, body });
    if (res.status < 200 || res.status > 299) throw rejection(res);
    return isRecord(res.body) ? res.body : {};
  }

  /** GET /v1/projects, every page, sorted by title. */
  async listProjects(userId: string): Promise<RemoteProject[]> {
    const rows = await this.pages(userId, "/v1/projects", "projects", {
      sort: "title"
    });
    return rows.map(toProject);
  }

  /** GET /v1/projects/{id}. */
  async getProject(userId: string, id: string): Promise<RemoteProject | null> {
    const body = await this.read(
      userId,
      `/v1/projects/${encodeURIComponent(id)}`
    );
    return isRecord(body?.project) ? toProject(body.project) : null;
  }

  /** POST /v1/projects: the non-empty fields as strings. */
  async createProject(
    userId: string,
    f: PmspaProjectWrite
  ): Promise<RemoteProject> {
    const body = await this.write(
      userId,
      "POST",
      "/v1/projects",
      Object.fromEntries(present(projectFields(f)))
    );
    if (!isRecord(body.project)) throw pmspaProblems.error();
    return toProject(body.project);
  }

  /** PATCH /v1/projects/{id} with the non-empty fields as `{propName, propValue}`. */
  async updateProject(
    userId: string,
    id: string,
    f: PmspaProjectWrite
  ): Promise<void> {
    const body = present(projectFields(f)).map(([propName, propValue]) => ({
      propName,
      propValue
    }));
    await this.write(
      userId,
      "PATCH",
      `/v1/projects/${encodeURIComponent(id)}`,
      body
    );
  }

  /** GET /v1/tasks?project=, every page. */
  async listTasks(userId: string, projectId: string): Promise<RemoteTask[]> {
    const rows = await this.pages(userId, "/v1/tasks", "tasks", {
      project: projectId
    });
    return rows.map(toTask);
  }

  /** GET /v1/tasks, every page: the caller's tasks in all projects. */
  async listAllTasks(userId: string): Promise<RemoteTask[]> {
    const rows = await this.pages(userId, "/v1/tasks", "tasks");
    return rows.map(toTask);
  }

  /** GET /v1/tasks?task={id}. */
  async getTask(userId: string, id: string): Promise<RemoteTask | null> {
    const body = await this.read(userId, "/v1/tasks", { task: id });
    return isRecord(body?.task) ? toTask(body.task) : null;
  }

  /** POST /v1/tasks: the non-empty fields as strings, `project` included. */
  async createTask(
    userId: string,
    f: PmspaTaskWrite & { project: string }
  ): Promise<RemoteTask> {
    const fields = { ...taskFields(f), project: f.project };
    const body = await this.write(
      userId,
      "POST",
      "/v1/tasks",
      Object.fromEntries(present(fields))
    );
    if (!isRecord(body.task)) throw pmspaProblems.error();
    return toTask(body.task);
  }

  /** PATCH /v1/tasks/{id} with the non-empty fields as `{propName, propValue}`. */
  async updateTask(
    userId: string,
    id: string,
    f: PmspaTaskWrite & { project?: string }
  ): Promise<void> {
    const fields = { ...taskFields(f), project: f.project };
    const body = present(fields).map(([propName, propValue]) => ({
      propName,
      propValue
    }));
    await this.write(
      userId,
      "PATCH",
      `/v1/tasks/${encodeURIComponent(id)}`,
      body
    );
  }

  /** GET /v1/days?start=&end= (the range form: event ids only), then one day per id. 404 → []. D9. */
  async listDays(
    userId: string,
    from: string,
    to: string
  ): Promise<RemoteDay[]> {
    const body = await this.read(userId, "/v1/days/event.find", {
      start: from,
      end: to
    });
    const found = Array.isArray(body?.days) ? body.days.filter(isRecord) : [];
    const days: RemoteDay[] = [];
    for (const d of found) {
      const day = await this.dayById(userId, String(d._id));
      if (day) days.push(day);
    }
    return days;
  }

  /** The one-day form: `?start=<date>` with its events populated. 404 → null. */
  async getDay(userId: string, date: string): Promise<RemoteDay | null> {
    const body = await this.read(userId, "/v1/days/event.find", {
      start: date
    });
    return isRecord(body?.days) ? toDay(body.days) : null;
  }

  /** The one-day form by the day's PMSPA id (`?id=`). 404 → null. */
  private async dayById(userId: string, id: string): Promise<RemoteDay | null> {
    const body = await this.read(userId, "/v1/days/event.find", { id });
    return isRecord(body?.days) ? toDay(body.days) : null;
  }

  /** POST /v1/days/event.create: the event with its first log (titled after the event, D4). */
  async createEvent(
    userId: string,
    e: {
      day: string;
      start: number;
      title: string;
      task: string | null;
      duration: number;
    }
  ): Promise<void> {
    await this.write(userId, "POST", "/v1/days/event.create", {
      day: e.day,
      start: e.start,
      title: e.title,
      duration: e.duration,
      ...(e.task === null ? {} : { task: e.task })
    });
  }

  /** PATCH /v1/days/event.update/{id} with the given fields as `{propName, propValue}`. */
  async updateEvent(
    userId: string,
    eventId: string,
    f: { booked?: boolean; title?: string }
  ): Promise<void> {
    const body = Object.entries(f)
      .filter(([, value]) => value !== undefined)
      .map(([propName, propValue]) => ({ propName, propValue }));
    await this.write(
      userId,
      "PATCH",
      `/v1/days/event.update/${encodeURIComponent(eventId)}`,
      body
    );
  }

  /** DELETE /v1/days/event.delete/{dayId}/{eventId}. */
  async deleteEvent(
    userId: string,
    dayId: string,
    eventId: string
  ): Promise<void> {
    await this.write(
      userId,
      "DELETE",
      `/v1/days/event.delete/${encodeURIComponent(dayId)}/${encodeURIComponent(eventId)}`
    );
  }

  /** POST /v1/days/log.create: one more log of an event. */
  async createLog(
    userId: string,
    eventId: string,
    l: { title: string; duration: number }
  ): Promise<void> {
    await this.write(userId, "POST", "/v1/days/log.create", {
      event: eventId,
      title: l.title,
      duration: l.duration
    });
  }

  /** PATCH /v1/days/log.update/{id}: the title and the duration (hours). */
  async updateLog(
    userId: string,
    logId: string,
    l: { title: string; duration: number }
  ): Promise<void> {
    await this.write(
      userId,
      "PATCH",
      `/v1/days/log.update/${encodeURIComponent(logId)}`,
      [
        { propName: "title", propValue: l.title },
        { propName: "duration", propValue: l.duration }
      ]
    );
  }

  /** DELETE /v1/days/log.delete/{id}. 404 → resolves: the log is already gone (D10). */
  async deleteLog(userId: string, logId: string): Promise<void> {
    const res = await this.client.request(userId, {
      method: "DELETE",
      path: `/v1/days/log.delete/${encodeURIComponent(logId)}`
    });
    if (res.status === 404) return;
    if (res.status < 200 || res.status > 299) throw rejection(res);
  }
}
