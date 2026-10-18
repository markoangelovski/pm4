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

/** A log inside its event (docs-pmspa `days.yaml`). */
export interface FakePmspaLog {
  id: string;
  title: string;
  /** Hours. */
  duration: number;
}

/** A PMSPA event: one block of time on a day, with its logs. */
export interface FakePmspaEvent {
  id: string;
  owner: string;
  /** The Day's id. */
  day: string;
  title: string;
  task: string | null;
  booked: boolean;
  logs: FakePmspaLog[];
}

/** A PMSPA day: its date, start hour and event ids, in creation order. */
export interface FakePmspaDay {
  id: string;
  owner: string;
  /** `YYYY-MM-DD`. */
  day: string;
  /** Decimal hour; absent when never set. */
  start?: number;
  events: string[];
}

/** One event `addDay` seeds: its logs as `[title, hours]`. */
export interface FakePmspaEventSeed {
  title: string;
  task?: string | null;
  booked?: boolean;
  logs: [string, number][];
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
 * than login, who-am-I, `projects.*`, `tasks.*` (feat-int-sync-api) and `days.*`
 * (feat-int-time-api) answer `404`. Like PMSPA, a repeated `start` or `end` on
 * `days.findByRange` takes the server down: every later request fails.
 */
export class FakePmspa {
  accounts: FakePmspaAccount[] = [];
  /** `fetch` rejects with `TypeError("fetch failed")`, and nothing is recorded. */
  unreachable = false;
  /** The next request answers `429` with this `Retry-After`. */
  rateLimitOnce: number | null = null;
  projects: FakePmspaProject[] = [];
  tasks: FakePmspaTask[] = [];
  days: FakePmspaDay[] = [];
  events: FakePmspaEvent[] = [];
  /** Set once a request repeated `start` or `end` on `days.findByRange` (PMSPA crashes, E7). */
  crashed = false;
  /** Lists answer at most this many records per page, whatever `limit` asks (PMSPA: 50). */
  pageSize = 50;
  /** Every answer waits this long, so concurrent requests overlap. */
  latencyMs = 0;
  /**
   * Headers every answer carries, e.g. `{"X-RateLimit-Limit": "100", "X-RateLimit-Remaining": "63", "X-RateLimit-Reset":
   * "<epoch s>"}` (feat-int-budget); not `rateLimitOnce`'s 429.
   */
  rateLimitHeaders: Record<string, string> | null = null;
  /** The most requests that were waiting for their answer at the same time. */
  maxInFlight = 0;
  /** The next request matching one of these answers its status and body instead; each matches once. */
  rejections: FakePmspaRejection[] = [];
  /** Every request that reached the fake, in order. */
  readonly calls: FakePmspaCall[] = [];
  /** Every token login issued, in order. */
  readonly issuedTokens: string[] = [];

  private inFlight = 0;
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

  /** Seeds a day of `owner` with its events, in order. */
  addDay(
    owner: string,
    date: string,
    start: number | undefined,
    events: FakePmspaEventSeed[]
  ): FakePmspaDay {
    const day: FakePmspaDay = {
      id: this.newId(),
      owner,
      day: date,
      events: []
    };
    if (start !== undefined) day.start = start;
    for (const e of events) {
      const event: FakePmspaEvent = {
        id: this.newId(),
        owner,
        day: day.id,
        title: e.title,
        task: e.task ?? null,
        booked: e.booked ?? false,
        logs: e.logs.map(([title, duration]) => ({
          id: this.newId(),
          title,
          duration
        }))
      };
      this.events.push(event);
      day.events.push(event.id);
    }
    this.days.push(day);
    return day;
  }

  /** The day of `date` (account X's unless `owner` is given). */
  dayOn(date: string, owner?: string): FakePmspaDay | undefined {
    return this.days.find(
      (d) => d.day === date && (owner === undefined || d.owner === owner)
    );
  }

  /** The events of the day of `date`, in the day's order. */
  eventsOn(date: string, owner?: string): FakePmspaEvent[] {
    const day = this.dayOn(date, owner);
    if (!day) return [];
    return day.events
      .map((id) => this.events.find((e) => e.id === id))
      .filter((e): e is FakePmspaEvent => e !== undefined);
  }

  /** The log `id` and its event. */
  findLog(
    id: string
  ): { event: FakePmspaEvent; log: FakePmspaLog } | undefined {
    for (const event of this.events) {
      const log = event.logs.find((l) => l.id === id);
      if (log) return { event, log };
    }
    return undefined;
  }

  readonly fetch: typeof globalThis.fetch = (input, init) => {
    if (this.unreachable || this.crashed) {
      return Promise.reject(new TypeError("fetch failed"));
    }
    const url = new URL(
      input instanceof Request ? input.url : input.toString()
    );
    const method = (init?.method ?? "GET").toUpperCase();
    const body = this.parseBody(init?.body);
    if (
      url.pathname === "/v1/days/event.find" &&
      (url.searchParams.getAll("start").length > 1 ||
        url.searchParams.getAll("end").length > 1)
    ) {
      this.crashed = true;
      return Promise.reject(new TypeError("fetch failed"));
    }
    this.calls.push({
      method,
      path: url.pathname,
      query: url.searchParams,
      body
    });
    const limited = this.rateLimitOnce !== null;
    const response = this.answer(
      method,
      url.pathname,
      url.searchParams,
      new Headers(init?.headers),
      body
    );
    if (!limited && this.rateLimitHeaders) {
      for (const [name, value] of Object.entries(this.rateLimitHeaders)) {
        response.headers.set(name, value);
      }
    }
    if (this.latencyMs === 0) return Promise.resolve(response);
    this.inFlight++;
    this.maxInFlight = Math.max(this.maxInFlight, this.inFlight);
    return new Promise((resolve) =>
      setTimeout(() => {
        this.inFlight--;
        resolve(response);
      }, this.latencyMs)
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
    if (path.startsWith("/v1/days/")) {
      const account =
        token === null ? undefined : this.accountById(this.tokens.get(token)!);
      if (!account) return tokenError("JsonWebTokenError");
      return this.dayRecords(account.id, method, path, query, body);
    }
    return json(404, { message: "Not found" });
  }

  /** `days.*` as docs-pmspa describes them (`days.yaml`), for the caller `owner`. */
  private dayRecords(
    owner: string,
    method: string,
    path: string,
    query: URLSearchParams,
    body: unknown
  ): Response {
    const [, , , action, a, b] = path.split("/");
    const hex = (v: unknown): v is string =>
      typeof v === "string" && /^[a-f\d]{24}$/i.test(v);
    // PMSPA's error handler: Error → 500, RangeError → 404, the code in `message`.
    const fail = (status: number, code: string) =>
      json(status, { message: code, error: {} });
    const mine = (e: FakePmspaEvent | FakePmspaDay) => e.owner === owner;

    if (method === "POST" && action === "event.create") {
      const f = this.fields(body as Record<string, unknown>);
      const start = f.start === undefined ? undefined : Number(f.start);
      if (start && !(start >= 0 && start <= 23.99)) {
        return fail(500, "ERR_START_RANGE_EXCEEDED");
      }
      const date =
        typeof f.day === "string"
          ? /\d{4}-\d{2}-\d{2}/.exec(f.day)?.[0]
          : undefined;
      if (!date) return fail(500, "ERR_DATE_FORMAT_INVALID");
      if (f.task !== undefined && !hex(f.task)) {
        return fail(500, "ERR_TASK_IDENTIFIER_INVALID");
      }
      const title = typeof f.title === "string" ? f.title.trim() : "";
      const duration = Number(f.duration);
      if (
        title.length < 3 ||
        title.length > 150 ||
        !(duration >= 0.25 && duration <= 24)
      ) {
        return json(500, {
          message: "Event validation failed",
          error: { name: "ValidationError" }
        });
      }
      // An unknown or foreign task silently gives an event without a task.
      const task =
        hex(f.task) &&
        this.tasks.some((t) => t.id === f.task && t.owner === owner)
          ? f.task
          : null;
      const event: FakePmspaEvent = {
        id: this.newId(),
        owner,
        day: "",
        title,
        task,
        booked: false,
        // The first log copies the event's title.
        logs: [{ id: this.newId(), title, duration }]
      };
      let day = this.days.find((d) => d.owner === owner && d.day === date);
      const isNew = day === undefined;
      if (day) {
        day.events.push(event.id);
        // An existing day's start is overwritten, with 0 when none is sent.
        day.start = start ? start : 0;
      } else {
        day = { id: this.newId(), owner, day: date, events: [event.id] };
        if (start !== undefined) day.start = start;
        this.days.push(day);
      }
      event.day = day.id;
      this.events.push(event);
      return json(201, {
        message: `Event ${title} successfully stored!`,
        day: isNew
          ? { ...this.dayDoc(day), events: [this.eventDoc(event)] }
          : this.dayDoc(day)
      });
    }

    if (method === "GET" && action === "event.find") {
      const taskId = query.get("task");
      if (taskId) {
        if (!hex(taskId)) return fail(500, "ERR_TASK_IDENTIFIER_INVALID");
        const events = this.events.filter((e) => mine(e) && e.task === taskId);
        if (events.length === 0) return fail(404, "ERR_NO_EVENTS_FOUND");
        return json(200, {
          message: "Event entries successfully found!",
          events: events.map((e) => this.eventDoc(e))
        });
      }
      const id = query.get("id");
      if (id) {
        if (!hex(id)) return fail(500, "ERR_DAY_IDENTIFIER_INVALID");
        const day = this.days.find((d) => mine(d) && d.id === id);
        if (!day) return fail(404, "ERR_NO_DAYS_FOUND");
        return json(200, {
          message: "Day entries successfully found!",
          days: this.populated(day)
        });
      }
      const start = this.dateArg(query.get("start"));
      const end = this.dateArg(query.get("end"));
      if (!start) return fail(500, "ERR_INVALID_REQUEST");
      if (end) {
        const days = this.days
          .filter((d) => mine(d) && d.day >= start && d.day <= end)
          .sort((x, y) => y.day.localeCompare(x.day));
        if (days.length === 0) return fail(404, "ERR_NO_DAY_ENTRIES_FOUND");
        return json(200, {
          message: "Day entries successfully found!",
          days: days.map((d) => this.dayDoc(d))
        });
      }
      const day = this.days.find((d) => mine(d) && d.day === start);
      if (!day) return fail(404, "ERR_NO_DAY_ENTRIES_FOUND");
      return json(200, {
        message: "Day entries successfully found!",
        days: this.populated(day)
      });
    }

    if (method === "PATCH" && action === "event.update") {
      if (!Array.isArray(body)) return fail(500, "ERR_SERVER_ERROR");
      const event = this.events.find((e) => mine(e) && e.id === a);
      if (!event) return fail(404, "ERR_EVENT_NOT_FOUND");
      for (const entry of body as {
        propName?: string;
        propValue?: unknown;
      }[]) {
        const { propName, propValue } = entry ?? {};
        if (propName === "booked") {
          event.booked = propValue === true || propValue === "true";
        } else if (propName === "title" && typeof propValue === "string") {
          event.title = propValue;
        } else if (propName === "task") {
          event.task = typeof propValue === "string" ? propValue : null;
        }
      }
      return json(200, { message: "Event successfully updated!" });
    }

    if (method === "DELETE" && action === "event.delete") {
      if (!hex(a)) return fail(500, "ERR_DAY_IDENTIFIER_INVALID");
      if (!hex(b)) return fail(500, "ERR_EVENT_IDENTIFIER_INVALID");
      const day = this.days.find((d) => mine(d) && d.id === a);
      if (!day) return fail(404, "ERR_DAY_NOT_FOUND");
      const event = this.events.find((e) => mine(e) && e.id === b);
      if (!event) return fail(404, "ERR_EVENT_NOT_FOUND");
      day.events = day.events.filter((id) => id !== event.id);
      this.events = this.events.filter((e) => e.id !== event.id);
      // A day left without events is removed.
      if (day.events.length === 0) {
        this.days = this.days.filter((d) => d.id !== day.id);
      }
      return json(200, {
        message: `Event ${event.title} deleted successfully!`,
        day: this.dayDoc(day)
      });
    }

    if (method === "POST" && action === "log.create") {
      const f = this.fields(body as Record<string, unknown>);
      if (!hex(f.event)) return fail(500, "ERR_EVENT_IDENTIFIER_INVALID");
      const event = this.events.find((e) => mine(e) && e.id === f.event);
      if (!event) return fail(404, "ERR_EVENT_NOT_FOUND");
      const title = this.str(f.title, "");
      event.logs.push({
        id: this.newId(),
        title,
        duration: Number(f.duration)
      });
      return json(201, { message: `Log ${title} successfully stored!` });
    }

    if (
      (method === "PATCH" && action === "log.update") ||
      (method === "DELETE" && action === "log.delete")
    ) {
      if (!hex(a)) return fail(500, "ERR_LOG_IDENTIFIER_INVALID");
      const found = this.findLog(a);
      if (!found || !mine(found.event)) return fail(404, "ERR_LOG_NOT_FOUND");
      const { event, log } = found;
      if (method === "DELETE") {
        event.logs = event.logs.filter((l) => l.id !== log.id);
        return json(200, { message: "Log successfully deleted!" });
      }
      if (!Array.isArray(body)) return fail(500, "ERR_SERVER_ERROR");
      for (const entry of body as {
        propName?: string;
        propValue?: unknown;
      }[]) {
        const { propName, propValue } = entry ?? {};
        if (propName === "duration") {
          const hours = Number(propValue);
          if (!(hours >= 0.25 && hours <= 24)) {
            return fail(500, "ERR_TIME_RANGE_EXCEEDED");
          }
          log.duration = hours;
        } else if (propName === "title" && typeof propValue === "string") {
          log.title = propValue;
        }
      }
      return json(200, { message: "Log successfully updated!" });
    }
    return json(404, { message: "Not found" });
  }

  /** A `start` / `end` argument: the `YYYY-MM-DD` it holds, else null (PMSPA: invalid → false). */
  private dateArg(value: string | null): string | null {
    return value ? (/^\d{4}-\d{2}-\d{2}/.exec(value)?.[0] ?? null) : null;
  }

  private dayDoc(d: FakePmspaDay) {
    return {
      _id: d.id,
      owner: d.owner,
      events: [...d.events],
      day: d.day,
      date: Date.parse(d.day),
      ...(d.start === undefined ? {} : { start: d.start }),
      createdAt: "2026-10-01T08:00:00.000Z",
      updatedAt: "2026-10-01T08:00:00.000Z",
      __v: 0
    };
  }

  /** The one-day form: events populated, in the day's order; ids without an event are dropped. */
  private populated(d: FakePmspaDay) {
    return {
      ...this.dayDoc(d),
      events: d.events
        .map((id) => this.events.find((e) => e.id === id))
        .filter((e): e is FakePmspaEvent => e !== undefined)
        .map((e) => this.eventDoc(e))
    };
  }

  private eventDoc(e: FakePmspaEvent) {
    return {
      _id: e.id,
      owner: e.owner,
      task: e.task,
      day: e.day,
      title: e.title,
      logs: e.logs.map((l) => ({
        _id: l.id,
        title: l.title,
        duration: l.duration
      })),
      booked: e.booked,
      duration: e.logs.reduce((t, l) => t + l.duration, 0),
      date: 1760000000000,
      createdAt: "2026-10-01T08:00:00.000Z",
      updatedAt: "2026-10-01T08:00:00.000Z",
      __v: 0
    };
  }

  /** A JSON body, or an urlencoded one (PMSPA reads both). */
  private parseBody(body: unknown): unknown {
    if (typeof body === "string") {
      try {
        return JSON.parse(body);
      } catch {
        return Object.fromEntries(new URLSearchParams(body));
      }
    }
    if (body instanceof URLSearchParams) return Object.fromEntries(body);
    return undefined;
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
