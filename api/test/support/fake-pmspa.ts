import { randomBytes } from "node:crypto";
import { isIP } from "node:net";

/** One PMSPA user account the fake can log in as. */
export interface FakePmspaAccount {
  /** A 24-hex ObjectId. */
  id: string;
  email: string;
  password: string;
  avatarUrl: string | null;
  role: "admin" | "user";
}

/** A PMSPA project (docs-pmspa `projects.yaml`); absent text fields are left out of answers. */
export interface FakePmspaProject {
  id: string;
  /** The owning account's id. */
  owner: string;
  title: string;
  description?: string;
  pl?: string;
  kanboard?: string;
  done: boolean;
}

/** A PMSPA task (docs-pmspa `tasks.yaml`). */
export interface FakePmspaTask {
  id: string;
  owner: string;
  /** The project's id. */
  project: string;
  title: string;
  description?: string;
  pl?: string;
  kanboard?: string;
  column: string;
  /** Epoch ms. */
  dueDate: number;
  done: boolean;
}

/** One answer the fake gives instead of handling the next matching request. */
export interface FakePmspaRejection {
  method: string;
  /** Matches when the request path starts with it, e.g. `/v1/tasks`. */
  path: string;
  status: number;
  body: unknown;
}

export interface FakePmspaCall {
  method: string;
  path: string;
  query: URLSearchParams;
  body: unknown;
}

const json = (
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers }
  });

/** PMSPA's answer to a missing, invalid or expired token on any route (cross-cutting 1.3). */
const tokenError = (name: "TokenExpiredError" | "JsonWebTokenError") =>
  json(500, {
    error: {
      name,
      message: name === "TokenExpiredError" ? "jwt expired" : "jwt malformed"
    }
  });

/**
 * An in-memory PMSPA behind `fetch` (feat-int-conn-api *Test doubles*), so no
 * e2e test talks to a real PMSPA. Use it with
 * `createTestApp([{ provide: PMSPA_FETCH, useValue: fake.fetch }, { provide: DNS_LOOKUP, useValue: fakeLookup }])`.
 *
 * Like PMSPA (docs-pmspa `users.login`, `users.checkAuth`): login answers
 * `{message, user}` with the token in header `X-Auth: Bearer <jwt>`; every
 * other route reads the token from the `auth` cookie (`Bearer%20<jwt>`) and
 * answers `500` with `error.name` for an invalid or expired one. Routes other
 * than login, who-am-I, `projects.*` and `tasks.*` (feat-int-sync-api) answer `404`.
 */
export class FakePmspa {
  accounts: FakePmspaAccount[] = [];
  /** `fetch` rejects with `TypeError("fetch failed")`, and nothing is recorded. */
  unreachable = false;
  /** The next request answers `429` with this `Retry-After`. */
  rateLimitOnce: number | null = null;
  projects: FakePmspaProject[] = [];
  tasks: FakePmspaTask[] = [];
  /** Lists answer at most this many records per page, whatever `limit` asks (PMSPA: 50). */
  pageSize = 50;
  /** Every answer waits this long, so concurrent requests overlap. */
  latencyMs = 0;
  /** The next request matching one of these answers its status and body instead; each matches once. */
  rejections: FakePmspaRejection[] = [];
  /** Every request that reached the fake, in order. */
  readonly calls: FakePmspaCall[] = [];
  /** Every token login issued, in order. */
  readonly issuedTokens: string[] = [];

  private readonly tokens = new Map<string, string>();
  private readonly expired = new Set<string>();

  /** Every token issued so far answers `500 {error: {name: "TokenExpiredError"}}`. */
  expireTokens(): void {
    for (const token of this.tokens.keys()) this.expired.add(token);
  }

  /** The requests to `method path` so far. */
  callsTo(method: string, path: string): FakePmspaCall[] {
    return this.calls.filter((c) => c.method === method && c.path === path);
  }

  readonly fetch: typeof globalThis.fetch = (input, init) => {
    if (this.unreachable) {
      return Promise.reject(new TypeError("fetch failed"));
    }
    const url = new URL(
      input instanceof Request ? input.url : input.toString()
    );
    const method = (init?.method ?? "GET").toUpperCase();
    const body: unknown =
      typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    this.calls.push({
      method,
      path: url.pathname,
      query: url.searchParams,
      body
    });
    const response = this.answer(
      method,
      url.pathname,
      url.searchParams,
      new Headers(init?.headers),
      body
    );
    if (this.latencyMs === 0) return Promise.resolve(response);
    return new Promise((resolve) =>
      setTimeout(() => resolve(response), this.latencyMs)
    );
  };

  /** A new 24-hex ObjectId. */
  newId(): string {
    return randomBytes(12).toString("hex");
  }

  private answer(
    method: string,
    path: string,
    query: URLSearchParams,
    headers: Headers,
    body: unknown
  ): Response {
    if (this.rateLimitOnce !== null) {
      const seconds = this.rateLimitOnce;
      this.rateLimitOnce = null;
      return json(
        429,
        {
          error: "ERR_RATE_LIMIT_REACHED",
          message: "Rate limit reached, please try again later."
        },
        { "Retry-After": String(seconds) }
      );
    }

    const token = this.cookieToken(headers);
    if (token !== null) {
      if (this.expired.has(token)) return tokenError("TokenExpiredError");
      if (!this.tokens.has(token)) return tokenError("JsonWebTokenError");
    }

    if (method === "POST" && path === "/v1/auth/login") {
      return this.login(body);
    }
    if (method === "POST" && path === "/v1/auth") {
      const account =
        token === null ? undefined : this.accountById(this.tokens.get(token)!);
      if (!account) return tokenError("JsonWebTokenError");
      return json(200, { user: this.user(account) });
    }

    const rejection = this.rejections.findIndex(
      (r) => r.method === method && path.startsWith(r.path)
    );
    if (rejection !== -1) {
      const [r] = this.rejections.splice(rejection, 1);
      return json(r.status, r.body);
    }

    if (path.startsWith("/v1/projects") || path.startsWith("/v1/tasks")) {
      const account =
        token === null ? undefined : this.accountById(this.tokens.get(token)!);
      if (!account) return tokenError("JsonWebTokenError");
      return this.records(account.id, method, path, query, body);
    }
    return json(404, { message: "Not found" });
  }

  /** `projects.*` and `tasks.*` as docs-pmspa describes them, for the caller `owner`. */
  private records(
    owner: string,
    method: string,
    path: string,
    query: URLSearchParams,
    body: unknown
  ): Response {
    const [, , kind, id] = path.split("/");
    const hex = (v: unknown) =>
      typeof v === "string" && /^[a-f\d]{24}$/i.test(v);

    if (kind === "projects") {
      if (method === "GET" && id === undefined) {
        const mine = this.projects
          .filter((p) => p.owner === owner)
          .sort((a, b) => a.title.localeCompare(b.title));
        return this.page(
          "projects",
          mine.map((p) => this.projectDoc(p)),
          query
        );
      }
      if (method === "POST" && id === undefined) {
        const fields = this.fields(body as Record<string, unknown>);
        const project: FakePmspaProject = {
          id: this.newId(),
          owner,
          title: this.str(fields.title, ""),
          done: fields.done === "true" || fields.done === true,
          ...this.text(fields, ["description", "pl", "kanboard"])
        };
        this.projects.push(project);
        return json(201, {
          message: `Project ${project.title} successfully created!`,
          project: this.projectDoc(project)
        });
      }
      if (!hex(id))
        return json(500, { error: "ERR_PROJECT_IDENTIFIER_INVALID" });
      const project = this.projects.find(
        (p) => p.id === id && p.owner === owner
      );
      if (!project) {
        return json(404, {
          error: "ERR_PROJECT_NOT_FOUND",
          message: "Project not found"
        });
      }
      if (method === "GET") {
        return json(200, {
          message: "Project found",
          project: this.projectDoc(project)
        });
      }
      if (method === "PATCH") {
        const updates = this.patch(body);
        Object.assign(
          project,
          this.text(updates, ["title", "description", "pl", "kanboard"])
        );
        if (updates.done !== undefined) project.done = updates.done === "true";
        return json(200, { message: "Project successfully updated!" });
      }
    }

    if (kind === "tasks") {
      if (method === "GET" && id === undefined) {
        const taskId = query.get("task");
        if (taskId) {
          const task = this.tasks.find(
            (t) => t.id === taskId && t.owner === owner
          );
          if (!task) {
            return json(404, {
              error: "ERR_TASK_NOT_FOUND",
              message: "Task not found"
            });
          }
          return json(200, { message: "Task found", task: this.taskDoc(task) });
        }
        const projectId = query.get("project");
        const mine = this.tasks.filter(
          (t) => t.owner === owner && (!projectId || t.project === projectId)
        );
        return this.page(
          "tasks",
          mine.map((t) => this.taskDoc(t)),
          query
        );
      }
      if (method === "POST" && id === undefined) {
        const fields = this.fields(body as Record<string, unknown>);
        if (!hex(fields.project)) {
          return json(500, { error: "ERR_PROJECT_IDENTIFIER_INVALID" });
        }
        if (!this.projects.some((p) => p.id === fields.project)) {
          return json(404, {
            error: "ERR_PROJECT_NOT_FOUND",
            message: "Project not found"
          });
        }
        const task: FakePmspaTask = {
          id: this.newId(),
          owner,
          project: String(fields.project),
          title: this.str(fields.title, "New Task"),
          column: this.str(fields.column, "Upcoming"),
          dueDate: this.dueDate(fields.dueDate) ?? Date.now(),
          done: fields.done === "true" || fields.done === true,
          ...this.text(fields, ["description", "pl", "kanboard"])
        };
        this.tasks.push(task);
        return json(201, {
          message: `Task ${task.title} successfully created!`,
          task: this.taskDoc(task)
        });
      }
      if (method === "PATCH") {
        if (!hex(id))
          return json(500, { error: "ERR_TASK_IDENTIFIER_INVALID" });
        const task = this.tasks.find((t) => t.id === id && t.owner === owner);
        if (!task) {
          return json(404, {
            error: "ERR_TASK_NOT_FOUND",
            message: "Task not found"
          });
        }
        const updates = this.patch(body);
        Object.assign(
          task,
          this.text(updates, [
            "title",
            "description",
            "pl",
            "kanboard",
            "column",
            "project"
          ])
        );
        if (updates.done !== undefined) task.done = updates.done === "true";
        const due = this.dueDate(updates.dueDate);
        if (due !== null) task.dueDate = due;
        return json(201, {
          message: `Task ${task.title} successfully updated!`,
          task: this.taskDoc(task)
        });
      }
    }
    return json(404, { message: "Not found" });
  }

  /** A list page: `skip`, `limit` (capped at `pageSize`), and 404 when there's nothing at all. */
  private page(
    name: "projects" | "tasks",
    all: unknown[],
    query: URLSearchParams
  ): Response {
    if (all.length === 0) {
      return json(404, {
        error: `ERR_${name.toUpperCase()}_NOT_FOUND`,
        message: "Not found"
      });
    }
    const skip = Math.max(0, Number(query.get("skip")) || 0);
    const asked = Number(query.get("limit")) || 50;
    const limit = Math.min(
      asked > 0 && asked <= 50 ? asked : 50,
      this.pageSize
    );
    const items = all.slice(skip, skip + limit);
    return json(200, {
      message: "Found",
      stats: {
        total: all.length,
        remaining: Math.max(0, all.length - skip - items.length),
        skipped: skip,
        results: items.length,
        sortOrder: "ascending",
        sortBy: "title"
      },
      [name]: items
    });
  }

  /** A create body: empty strings count as absent. */
  private fields(
    body: Record<string, unknown> | undefined
  ): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body ?? {})) {
      if (v !== "" && v !== null && v !== undefined) out[k] = v;
    }
    return out;
  }

  /** A PATCH body `[{propName, propValue}]`: falsy values are skipped, so nothing can be cleared. */
  private patch(body: unknown): Record<string, string> {
    const out: Record<string, string> = {};
    for (const entry of Array.isArray(body) ? body : [body]) {
      const { propName, propValue } = (entry ?? {}) as {
        propName?: string;
        propValue?: string;
      };
      if (propName && propValue) out[propName] = propValue;
    }
    return out;
  }

  private text(
    fields: Record<string, unknown>,
    names: string[]
  ): Record<string, string> {
    const out: Record<string, string> = {};
    for (const name of names) {
      if (typeof fields[name] === "string") out[name] = fields[name];
    }
    return out;
  }

  private str(value: unknown, fallback: string): string {
    return typeof value === "string" ? value : fallback;
  }

  /** Only a string of epoch-ms digits is stored. */
  private dueDate(value: unknown): number | null {
    return typeof value === "string" && /^\d+$/.test(value)
      ? Number(value)
      : null;
  }

  private projectDoc(p: FakePmspaProject) {
    const tasks = this.tasks.filter((t) => t.project === p.id);
    return {
      _id: p.id,
      title: p.title,
      ...(p.description === undefined ? {} : { description: p.description }),
      owner: p.owner,
      ...(p.pl === undefined ? {} : { pl: p.pl }),
      ...(p.kanboard === undefined ? {} : { kanboard: p.kanboard }),
      date: 1760000000000,
      openTasksCount: tasks.filter((t) => !t.done).length,
      closedTasksCount: tasks.filter((t) => t.done).length,
      done: p.done,
      createdAt: "2026-10-01T08:00:00.000Z"
    };
  }

  private taskDoc(t: FakePmspaTask) {
    return {
      _id: t.id,
      title: t.title,
      ...(t.description === undefined ? {} : { description: t.description }),
      owner: t.owner,
      ...(t.pl === undefined ? {} : { pl: t.pl }),
      column: t.column,
      ...(t.kanboard === undefined ? {} : { kanboard: t.kanboard }),
      dueDate: t.dueDate,
      project: t.project,
      eventsCount: 0,
      notesCount: 0,
      tags: [],
      date: 1760000000000,
      done: t.done,
      createdAt: "2026-10-01T08:00:00.000Z",
      updatedAt: "2026-10-01T08:00:00.000Z",
      __v: 0
    };
  }

  private login(body: unknown): Response {
    const { email, password } = (body ?? {}) as {
      email?: unknown;
      password?: unknown;
    };
    if (typeof email !== "string" || typeof password !== "string") {
      return json(422, { message: "Unable to login" });
    }
    const account = this.accounts.find((a) => a.email === email);
    if (!account) return json(422, { message: "User not found!" });
    if (account.password !== password) {
      return json(409, { message: "Unable to login" });
    }
    const token = randomBytes(24).toString("base64url");
    this.tokens.set(token, account.id);
    this.issuedTokens.push(token);
    return json(
      200,
      { message: "Login successful", user: this.user(account) },
      {
        "X-Auth": `Bearer ${token}`,
        "Set-Cookie": `auth=Bearer%20${token}; Path=/; HttpOnly; Secure; SameSite=None`
      }
    );
  }

  private cookieToken(headers: Headers): string | null {
    const cookie = headers.get("cookie");
    if (!cookie) return null;
    for (const part of cookie.split(";")) {
      const [name, ...rest] = part.trim().split("=");
      if (name !== "auth") continue;
      const value = decodeURIComponent(rest.join("="));
      return value.startsWith("Bearer ")
        ? value.slice("Bearer ".length)
        : value;
    }
    return null;
  }

  private accountById(id: string): FakePmspaAccount | undefined {
    return this.accounts.find((a) => a.id === id);
  }

  private user(account: FakePmspaAccount) {
    return {
      _id: account.id,
      email: account.email,
      avatar_url: account.avatarUrl,
      role: account.role
    };
  }
}

const FAKE_HOSTS: Record<string, string> = {
  "pmspa.test": "203.0.113.10",
  "internal.test": "10.0.0.5"
};

/**
 * Stands in for `dns.promises.lookup(host, { all: true })`: `pmspa.test` is
 * public, `internal.test` private, an IP literal resolves to itself, and
 * anything else fails with `ENOTFOUND`.
 */
export function fakeLookup(
  host: string
): Promise<{ address: string; family: number }[]> {
  const bare = host.replace(/^\[|\]$/g, "");
  const family = isIP(bare);
  if (family !== 0) return Promise.resolve([{ address: bare, family }]);
  const address = FAKE_HOSTS[host.toLowerCase()];
  if (!address) {
    return Promise.reject(
      Object.assign(new Error(`getaddrinfo ENOTFOUND ${host}`), {
        code: "ENOTFOUND"
      })
    );
  }
  return Promise.resolve([{ address, family: 4 }]);
}
