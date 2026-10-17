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
    method: "POST" | "PATCH",
    path: string,
    body: unknown
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
}
