import { createHash, randomUUID } from "node:crypto";
import { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { DNS_LOOKUP } from "../src/integrations/pmspa/pmspa-host-guard.js";
import { PMSPA_FETCH } from "../src/integrations/pmspa/pmspa-transport.js";
import { createTestApp } from "./create-test-app.js";
import {
  accessTokenFor,
  closeTestClients,
  deleteTestUsers,
  insertUser,
  testDb,
  testRedis,
  type UserRow
} from "./support/auth-test-utils.js";
import {
  FakePmspa,
  fakeLookup,
  type FakePmspaAccount,
  type FakePmspaCall
} from "./support/fake-pmspa.js";
import { insertProject } from "./support/project-test-utils.js";

const errorType = (slug: string) => `${process.env.WEB_APP_URL}/errors/${slug}`;

/** Noon in Zagreb on 2026-10-17: "today" for every user (`Europe/Zagreb`). */
const NOW = new Date("2026-10-17T10:00:00.000Z");
const TODAY = "2026-10-17";

const PMSPA_URL = "https://pmspa.test";
const RATE_KEY = "pmspa:rate:pmspa.test";
const X = "65f1a0c0ffee00000000000a";
const Y = "65f1a0c0ffee00000000000b";

const accountX = (): FakePmspaAccount => ({
  id: X,
  email: "x@pmspa.test",
  password: "secret",
  avatarUrl: null,
  role: "user"
});
const accountY = (): FakePmspaAccount => ({
  id: Y,
  email: "y@pmspa.test",
  password: "secret",
  avatarUrl: null,
  role: "user"
});

/** A 24-hex PMSPA id, distinct per `n`. */
const id = (n: number) => `77f1a0c0e4b0${n.toString(16).padStart(12, "0")}`;

/** PMSPA due dates: 30 Oct 2026, 12:00 UTC. */
const DUE = Date.UTC(2026, 9, 30, 12);
const SYNCED_AT = new Date("2026-10-01T08:00:00.000Z");

const hash = (tuple: (string | null)[]): Buffer =>
  createHash("sha256").update(JSON.stringify(tuple)).digest().subarray(0, 8);
const STALE = hash(["stale"]);

type LinkType = "project" | "task";
const LINK_TABLE = {
  project: ["pmspa_project_links", "project_id"],
  task: ["pmspa_task_links", "task_id"]
} as const;

async function insertLink(
  type: LinkType,
  userId: string,
  pm4Id: string,
  pmspaId: string
): Promise<void> {
  const [table, column] = LINK_TABLE[type];
  await testDb().query(
    `INSERT INTO ${table}
       (synced_at, origin, ${column}, user_id, pmspa_user_id, pmspa_id, pm4_hash, pmspa_hash)
     VALUES ($1, 'linked', $2, $3, decode($4, 'hex'), decode($5, 'hex'), $6, $7)`,
    [SYNCED_AT, pm4Id, userId, X, pmspaId, STALE, STALE]
  );
}

async function findLink(
  type: LinkType,
  pm4Id: string
): Promise<{ pmspa_id: string } | null> {
  const [table, column] = LINK_TABLE[type];
  const result = await testDb().query<{ pmspa_id: string }>(
    `SELECT encode(pmspa_id, 'hex') AS pmspa_id FROM ${table} WHERE ${column} = $1`,
    [pm4Id]
  );
  return result.rows[0] ?? null;
}

async function insertTaskRow(
  userId: string,
  projectId: string,
  title: string
): Promise<{ id: string }> {
  const result = await testDb().query<{ id: string }>(
    `INSERT INTO tasks (user_id, project_id, title, status)
     VALUES ($1, $2, $3, 'in-progress') RETURNING id`,
    [userId, projectId, title]
  );
  return result.rows[0];
}

interface RateLimitBody {
  limit: number;
  remaining: number;
  resetAt: string;
  observedAt: string;
}
interface ConnectionBody {
  status: string;
  rateLimit: RateLimitBody | null;
}
interface PmspaTaskBody {
  id: string;
  projectId: string;
  title: string;
  column: string;
  link: { pm4Id: string; pm4Title: string; origin: string } | null;
}
interface PmspaLogBody {
  id: string;
  title: string;
  durationMinutes: number;
  linked: boolean;
}
interface PmspaEventBody {
  id: string;
  title: string;
  task: { id: string; title: string; projectTitle: string } | null;
  booked: boolean;
  logs: PmspaLogBody[];
}
interface PmspaDayBody {
  date: string;
  startMinute: number | null;
  totalMinutes: number;
  linkState: string;
  events: PmspaEventBody[];
}
interface Candidate {
  id: string;
  title: string;
  groupId: string | null;
  detail: string | null;
  differences: { field: string; pm4: string | null; pmspa: string | null }[];
}
interface PreviewItem {
  key: string;
  parentKey: string | null;
  type: string;
  title: string;
  detail: string | null;
  action: string;
  reason: string | null;
  linkedId: string | null;
  parent: boolean;
  candidates: Candidate[] | null;
  taskPath?: { projectTitle: string; taskTitle: string };
}
interface PreviewBody {
  items: PreviewItem[];
  days?: PmspaDayBody[];
}
interface ResultBody {
  items: { key: string; outcome: string; reason: string | null }[];
  syncedAt: string;
  days?: PmspaDayBody[];
}
interface CandidatesBody {
  items: { pm4Id: string; candidates: Candidate[] }[];
}
interface Problem {
  type: string;
}

interface Res<T> {
  status: number;
  body: T;
}

async function send<T>(req: request.Test): Promise<Res<T>> {
  const response = await req;
  return { status: response.status, body: response.body as T };
}

const byKey = <T extends { key: string }>(items: T[]) =>
  Object.fromEntries(items.map((i) => [i.key, i]));

/** A fake PMSPA call as `METHOD /path?<the query keys that pick a record>`. */
const callOf = (c: FakePmspaCall) => {
  const query = ["task", "project", "start", "end", "id"]
    .filter((k) => c.query.has(k))
    .map((k) => `${k}=${c.query.get(k)}`)
    .join("&");
  return `${c.method} ${c.path}${query ? `?${query}` : ""}`;
};

describe("PMSPA call budget (feat-int-budget)", () => {
  let app: NestExpressApplication;
  let fake: FakePmspa;
  const userIds: string[] = [];

  beforeAll(async () => {
    // Only `Date` is faked, so "today" is fixed and timers still run.
    vi.useFakeTimers({ toFake: ["Date"], now: NOW });
    // The app keeps one fetch; it forwards to the current test's fake.
    const fetchViaFake: typeof globalThis.fetch = (input, init) =>
      fake.fetch(input, init);
    app = await createTestApp([
      { provide: PMSPA_FETCH, useValue: fetchViaFake },
      { provide: DNS_LOOKUP, useValue: fakeLookup }
    ]);
  });

  beforeEach(async () => {
    fake = new FakePmspa();
    fake.accounts = [accountX(), accountY()];
    await testRedis().del("pmspa:pause:pmspa.test", RATE_KEY);
  });

  afterAll(async () => {
    const keys = userIds.flatMap((uid) => [
      `pmspa:token:${uid}`,
      `pmspa:account:${uid}`,
      `pmspa:lock:${uid}`
    ]);
    await testRedis().del("pmspa:pause:pmspa.test", RATE_KEY, ...keys);
    await deleteTestUsers();
    await closeTestClients();
    await app.close();
    vi.useRealTimers();
  });

  /** Supertest under `base` (default: the connector) with `user`'s bearer token. */
  const as = (user: UserRow, base = "/api/v1/integrations/pmspa") => {
    const server = app.getHttpServer();
    const auth = `Bearer ${accessTokenFor(user.id)}`;
    return {
      get: <T>(path: string) =>
        send<T>(
          request(server)
            .get(base + path)
            .set("Authorization", auth)
        ),
      post: <T>(path: string, body: object) =>
        send<T>(
          request(server)
            .post(base + path)
            .set("Authorization", auth)
            .send(body)
        ),
      put: <T>(path: string, body: object) =>
        send<T>(
          request(server)
            .put(base + path)
            .set("Authorization", auth)
            .send(body)
        )
    };
  };

  const newUser = async (): Promise<UserRow> => {
    const user = await insertUser();
    userIds.push(user.id);
    return user;
  };

  /** A new user (Europe/Zagreb) connected to account X; its PMSPA token is cached. */
  const connected = async (): Promise<UserRow> => {
    const user = await newUser();
    const res = await as(user).put<object>("", {
      url: PMSPA_URL,
      email: "x@pmspa.test",
      password: "secret",
      confirmAccountSwitch: true
    });
    expect(res.status).toBe(200);
    return user;
  };

  const project = (pid: string, title: string, owner = X) =>
    fake.projects.push({ id: pid, owner, title, done: false });
  const task = (tid: string, projectId: string, title: string, owner = X) =>
    fake.tasks.push({
      id: tid,
      owner,
      project: projectId,
      title,
      column: "In Progress",
      dueDate: DUE,
      done: false
    });

  /** The fake's calls from index `from` on, as `callOf`, sorted. */
  const callsSince = (from: number) =>
    fake.calls.slice(from).map(callOf).sort();

  /** Creates a PM4 log for TODAY through the API (the day's start 08:00). */
  const addLog = async (user: UserRow, fields: Record<string, unknown>) => {
    const res = await as(user, "/api/v1").post<{ id: string }>("/time-logs", {
      workDate: TODAY,
      dayStartMinute: 480,
      ...fields
    });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    return res.body;
  };

  const rateHeaders = (remaining: number, reset: number) => ({
    "X-RateLimit-Limit": "100",
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(reset)
  });

  it("AC-1 FR-INT-015 API-INT-001: PMSPA's X-RateLimit-* of its last answer, for every PM4 user on the host; an answer without them leaves it", async () => {
    const a = await connected();
    const b = await connected();
    const reset = Math.floor(Date.now() / 1000) + 540;
    fake.rateLimitHeaders = rateHeaders(63, reset);

    const before = Date.now();
    expect((await as(a).get("/projects")).status).toBe(200);
    const after = Date.now();

    const expected = {
      limit: 100,
      remaining: 63,
      resetAt: new Date(reset * 1000).toISOString()
    };
    const ofA = await as(a).get<ConnectionBody>("");
    expect(ofA.status).toBe(200);
    expect(ofA.body.rateLimit).toMatchObject(expected);
    const observedAt = Date.parse(ofA.body.rateLimit!.observedAt);
    expect(observedAt).toBeGreaterThanOrEqual(before);
    expect(observedAt).toBeLessThanOrEqual(after);
    expect(new Date(observedAt).toISOString()).toBe(
      ofA.body.rateLimit!.observedAt
    );
    expect((await as(b).get<ConnectionBody>("")).body.rateLimit).toEqual(
      ofA.body.rateLimit
    );

    fake.rateLimitHeaders = null;
    expect((await as(a).get("/projects")).status).toBe(200);
    expect((await as(a).get<ConnectionBody>("")).body.rateLimit).toEqual(
      ofA.body.rateLimit
    );
  });

  it("AC-2 FR-INT-015 API-INT-001: a 429 with only Retry-After → remaining 0 until then; not configured or no answer for the host → null", async () => {
    const a = await connected();
    fake.rateLimitHeaders = rateHeaders(
      63,
      Math.floor(Date.now() / 1000) + 540
    );
    expect((await as(a).get("/projects")).status).toBe(200);

    fake.rateLimitHeaders = null;
    fake.rateLimitOnce = 600;
    expect((await as(a).get("/projects")).status).not.toBe(200);

    const limited = (await as(a).get<ConnectionBody>("")).body.rateLimit;
    expect(limited).toMatchObject({ limit: 100, remaining: 0 });
    const resetIn = Date.parse(limited!.resetAt) - Date.now();
    expect(resetIn).toBeGreaterThanOrEqual(599_000);
    expect(resetIn).toBeLessThanOrEqual(601_000);

    const stranger = await newUser();
    const notConfigured = await as(stranger).get<ConnectionBody>("");
    expect(notConfigured.body).toMatchObject({
      status: "not-configured",
      rateLimit: null
    });

    await testRedis().del(RATE_KEY);
    expect((await as(a).get<ConnectionBody>("")).body.rateLimit).toBeNull();
  });

  it("AC-3 FR-INT-015 API-INT-006: a project's tasks are one PMSPA call, no projects read; another account's project → []", async () => {
    const a = await connected();
    const P = id(1);
    project(P, "Platform");
    task(id(11), P, "API");
    task(id(12), P, "Web");
    task(id(13), P, "Ops");
    const P_OTHER = id(2);
    project(P_OTHER, "Other", Y);
    task(id(21), P_OTHER, "Theirs", Y);

    const from = fake.calls.length;
    const res = await as(a).get<{ items: PmspaTaskBody[] }>(
      `/projects/${P}/tasks`
    );
    expect(res.status).toBe(200);
    expect(res.body.items.map((t) => t.id)).toEqual([id(11), id(12), id(13)]);
    expect(callsSince(from)).toEqual([`GET /v1/tasks?project=${P}`]);

    const other = await as(a).get<{ items: PmspaTaskBody[] }>(
      `/projects/${P_OTHER}/tasks`
    );
    expect(other.status).toBe(200);
    expect(other.body).toEqual({ items: [] });
  });

  it("AC-4 FR-INT-015 API-INT-017: every task of the account with its links, all pages of one list", async () => {
    const a = await connected();
    fake.pageSize = 2;
    const [P1, P2] = [id(1), id(2)];
    project(P1, "Platform");
    project(P2, "Website");
    task(id(11), P1, "API");
    task(id(12), P1, "Web");
    task(id(13), P1, "Ops");
    task(id(21), P2, "Design");
    task(id(22), P2, "Launch");
    project(id(3), "Other", Y);
    task(id(31), id(3), "Theirs", Y);
    const pm4Project = await insertProject(a.id, { title: "Platform" });
    const api = await insertTaskRow(a.id, pm4Project.id, "API (PM4)");
    await insertLink("task", a.id, api.id, id(11));

    const from = fake.calls.length;
    const res = await as(a).get<{ items: PmspaTaskBody[] }>("/tasks");

    expect(res.status).toBe(200);
    expect(res.body.items.map((t) => t.id).sort()).toEqual(
      [id(11), id(12), id(13), id(21), id(22)].sort()
    );
    const items = Object.fromEntries(res.body.items.map((t) => [t.id, t]));
    expect(items[id(11)]).toMatchObject({
      projectId: P1,
      title: "API",
      column: "In Progress",
      link: { pm4Id: api.id, pm4Title: "API (PM4)", origin: "linked" }
    });
    expect(items[id(22)]).toMatchObject({ projectId: P2, link: null });
    expect(callsSince(from)).toEqual([
      "GET /v1/tasks",
      "GET /v1/tasks",
      "GET /v1/tasks"
    ]);
  });

  it("AC-5 FR-INT-015 API-INT-007: a week is one PMSPA call answering day summaries, newest first, without events", async () => {
    const a = await connected();
    const P = id(1);
    project(P, "Platform");
    task(id(11), P, "API");
    const logs: [string, number][] = [["Work", 1]];
    fake.addDay(X, "2026-10-14", 9, [
      { title: "API", task: id(11), logs },
      { title: "Internal", logs }
    ]);
    fake.addDay(X, "2026-10-16", 8.5, [
      { title: "API", task: id(11), logs },
      { title: "Internal", logs },
      { title: "Meetings", logs }
    ]);

    const from = fake.calls.length;
    const res = await as(a).get<{ items: object[] }>(
      "/days?from=2026-10-12&to=2026-10-18"
    );

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([
      { date: "2026-10-16", startMinute: 510, eventCount: 3 },
      { date: "2026-10-14", startMinute: 540, eventCount: 2 }
    ]);
    expect(callsSince(from)).toEqual([
      "GET /v1/days/event.find?start=2026-10-12&end=2026-10-18"
    ]);
  });

  it("AC-6 FR-INT-015 API-INT-018: given days with their events: one call per day, per distinct task and per project of those tasks; bad dates → 400", async () => {
    const a = await connected();
    const P = id(1);
    project(P, "Platform");
    const [A, B, D] = [id(11), id(12), id(13)];
    task(A, P, "API");
    task(B, P, "Web");
    fake.addDay(X, "2026-10-16", 9, [
      { title: "API", task: A, logs: [["Endpoints", 1]] },
      { title: "Web", task: B, logs: [["Forms", 0.5]] },
      { title: "Internal", logs: [["Inbox", 0.25]] }
    ]);
    fake.addDay(X, "2026-10-14", 8, [
      { title: "API again", task: A, logs: [["Tests", 2]] },
      { title: "Gone", task: D, logs: [["Old", 1]] }
    ]);

    const from = fake.calls.length;
    const res = await as(a).get<{ items: PmspaDayBody[] }>(
      "/days/details?dates=2026-10-16&dates=2026-10-14"
    );

    expect(res.status).toBe(200);
    expect(callsSince(from)).toEqual(
      [
        "GET /v1/days/event.find?start=2026-10-16",
        "GET /v1/days/event.find?start=2026-10-14",
        `GET /v1/tasks?task=${A}`,
        `GET /v1/tasks?task=${B}`,
        `GET /v1/tasks?task=${D}`,
        `GET /v1/projects/${P}`
      ].sort()
    );
    expect(res.body.items.map((d) => d.date)).toEqual([
      "2026-10-16",
      "2026-10-14"
    ]);
    const [d16, d14] = res.body.items;
    expect(d16.events.map((e) => [e.title, e.task])).toEqual([
      ["API", { id: A, title: "API", projectTitle: "Platform" }],
      ["Web", { id: B, title: "Web", projectTitle: "Platform" }],
      ["Internal", null]
    ]);
    expect(d14.events.map((e) => [e.title, e.task])).toEqual([
      ["API again", { id: A, title: "API", projectTitle: "Platform" }],
      ["Gone", null]
    ]);
    expect(d16).toMatchObject({
      startMinute: 540,
      totalMinutes: 105,
      linkState: "not-linked"
    });

    const missing = await as(a).get<{ items: PmspaDayBody[] }>(
      "/days/details?dates=2026-10-15&dates=2026-10-16"
    );
    expect(missing.status).toBe(200);
    expect(missing.body.items.map((d) => d.date)).toEqual(["2026-10-16"]);

    const eight = Array.from(
      { length: 8 },
      (_, i) => `dates=2026-10-${String(10 + i).padStart(2, "0")}`
    ).join("&");
    for (const query of [
      "",
      `?${eight}`,
      "?dates=2026-10-16&dates=2026-10-16",
      "?dates=2026-02-30"
    ]) {
      expect((await as(a).get(`/days/details${query}`)).status, query).toBe(
        400
      );
    }
  });

  it("AC-7 FR-INT-015 API-INT-018: at most 2 PMSPA calls at a time", async () => {
    const a = await connected();
    const P = id(1);
    project(P, "Platform");
    const tasks = [11, 12, 13, 14, 15].map(id);
    tasks.forEach((tid, i) => task(tid, P, `Task ${i + 1}`));
    const logs: [string, number][] = [["Work", 1]];
    fake.addDay(
      X,
      "2026-10-16",
      9,
      tasks.slice(0, 3).map((tid) => ({ title: "Work", task: tid, logs }))
    );
    fake.addDay(
      X,
      "2026-10-15",
      9,
      tasks.slice(3).map((tid) => ({ title: "Work", task: tid, logs }))
    );
    fake.latencyMs = 30;
    fake.maxInFlight = 0;

    const res = await as(a).get<{ items: PmspaDayBody[] }>(
      "/days/details?dates=2026-10-16&dates=2026-10-15"
    );

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(fake.maxInFlight).toBeLessThanOrEqual(2);
  });

  /** AC-8/AC-9: unlinked task A (project P) on 16 and 17 Oct, unlinked task C (P) on 17 Oct. */
  const timeImportSetup = async () => {
    const a = await connected();
    const P = id(1);
    project(P, "Platform");
    const [A, C] = [id(11), id(12)];
    task(A, P, "API");
    task(C, P, "Code review");
    task(id(13), P, "Not needed");
    project(id(2), "Not needed either");
    fake.addDay(X, "2026-10-16", 9, [
      { title: "API", task: A, logs: [["Endpoints", 1]] }
    ]);
    fake.addDay(X, TODAY, 8, [
      { title: "API", task: A, logs: [["Tests", 1]] },
      { title: "Code review", task: C, logs: [["PR 12", 0.5]] }
    ]);
    return { a, P, A, C };
  };
  const DATES = ["2026-10-16", TODAY];

  it("AC-8 FR-INT-011 API-INT-008: a time import preview reads only what the days need; projects and tasks before days, dated parent reasons, task paths and the days", async () => {
    const { a, P, A, C } = await timeImportSetup();

    const from = fake.calls.length;
    const res = await as(a).post<PreviewBody>("/import/preview", {
      projects: [],
      dates: DATES
    });

    expect(res.status).toBe(200);
    const lists = fake.calls
      .slice(from)
      .filter(
        (c) =>
          c.path === "/v1/projects" ||
          (c.path === "/v1/tasks" && !c.query.has("task"))
      );
    expect(lists.map(callOf)).toEqual([]);

    const keys = res.body.items.map((i) => i.key);
    const firstDay = Math.min(
      keys.indexOf("day:2026-10-16"),
      keys.indexOf(`day:${TODAY}`)
    );
    for (const key of [`project:${P}`, `task:${A}`, `task:${C}`]) {
      expect(keys.indexOf(key), key).toBeGreaterThanOrEqual(0);
      expect(keys.indexOf(key), key).toBeLessThan(firstDay);
    }
    const items = byKey(res.body.items);
    expect(items[`task:${A}`].reason).toBe(
      "Parent of imported events from 16 Oct 2026 and 17 Oct 2026"
    );
    expect(items[`task:${C}`].reason).toBe(
      "Parent of an imported event from 17 Oct 2026"
    );
    const event = fake.eventsOn("2026-10-16", X)[0];
    expect(items[`event:${event.id}`]).toMatchObject({
      taskPath: { projectTitle: "Platform", taskTitle: "API" },
      detail: "1 log · 1h"
    });

    const details = await as(a).get<{ items: PmspaDayBody[] }>(
      "/days/details?dates=2026-10-16&dates=2026-10-17"
    );
    expect(details.status).toBe(200);
    expect(res.body.days).toEqual(details.body.items);
  });

  it("AC-9 FR-INT-011 API-INT-009: the import answers its days as linked, from the preview's reads only", async () => {
    const { a } = await timeImportSetup();

    const from = fake.calls.length;
    const preview = await as(a).post<PreviewBody>("/import/preview", {
      projects: [],
      dates: DATES
    });
    expect(preview.status).toBe(200);
    const previewCalls = callsSince(from);

    const start = fake.calls.length;
    const res = await as(a).post<ResultBody>("/import", {
      selection: { projects: [], dates: DATES },
      choices: []
    });

    expect(res.status).toBe(200);
    expect(res.body.items.filter((i) => i.outcome === "failed")).toEqual([]);
    expect(callsSince(start)).toEqual(previewCalls);
    expect(res.body.days?.map((d) => [d.date, d.linkState])).toEqual([
      [TODAY, "linked"],
      ["2026-10-16", "linked"]
    ]);
    for (const log of res.body.days!.flatMap((d) =>
      d.events.flatMap((e) => e.logs)
    )) {
      expect(log.linked).toBe(true);
    }
  });

  it("AC-10 FR-INT-012 API-INT-010: a day push event row names the linked PMSPA task and project; detail is only the logs", async () => {
    const a = await connected();
    const [PP, TA] = [id(1), id(11)];
    project(PP, "Platform (PMSPA)");
    task(TA, PP, "API (PMSPA)");
    const q = await insertProject(a.id, { title: "Platform" });
    const api = await insertTaskRow(a.id, q.id, "API");
    await insertLink("project", a.id, q.id, PP);
    await insertLink("task", a.id, api.id, TA);
    await addLog(a, {
      durationMinutes: 60,
      text: "Endpoints",
      projectId: q.id,
      taskId: api.id
    });
    await addLog(a, { durationMinutes: 30, text: "Email" });

    const res = await as(a).post<PreviewBody>("/push/preview", {
      type: "day",
      id: TODAY
    });

    expect(res.status).toBe(200);
    const items = byKey(res.body.items);
    expect(items[`event:task:${api.id}`]).toMatchObject({
      taskPath: { projectTitle: "Platform (PMSPA)", taskTitle: "API (PMSPA)" },
      detail: "1 log · 1h"
    });
    const unsorted = items["event:unsorted:Unsorted"];
    expect(unsorted.detail).toBe("No task · 1 log · 30m");
    expect(unsorted.taskPath).toBeUndefined();
  });

  it("AC-18 FR-INT-015 API-INT-015: a linked project's sync reads it by id, its tasks as one list and its PM4 tasks' other linked tasks; candidates from that list", async () => {
    const a = await connected();
    const [PX, PY] = [id(1), id(2)];
    const [X1, X2, X3, Y1] = [id(11), id(12), id(13), id(21)];
    project(PX, "Platform");
    project(PY, "Website");
    project(id(3), "Unrelated");
    task(X1, PX, "API");
    task(X2, PX, "content");
    task(X3, PX, "Analytics");
    task(Y1, PY, "Design");
    const p = await insertProject(a.id, { title: "Platform" });
    const t1 = await insertTaskRow(a.id, p.id, "API");
    const t2 = await insertTaskRow(a.id, p.id, "Content");
    const t3 = await insertTaskRow(a.id, p.id, "Design");
    await insertLink("project", a.id, p.id, PX);
    await insertLink("task", a.id, t1.id, X1);
    await insertLink("task", a.id, t3.id, Y1);

    const from = fake.calls.length;
    const res = await as(a).post<PreviewBody>("/sync/preview", {
      type: "project",
      id: p.id
    });

    expect(res.status).toBe(200);
    expect(callsSince(from)).toEqual(
      [
        `GET /v1/projects/${PX}`,
        `GET /v1/tasks?project=${PX}`,
        `GET /v1/tasks?task=${Y1}`
      ].sort()
    );
    const items = byKey(res.body.items);
    expect(items[`project:${p.id}`]).toMatchObject({
      linkedId: PX,
      candidates: []
    });
    expect(items[`task:${t2.id}`].linkedId).toBeNull();
    expect(
      items[`task:${t2.id}`].candidates?.map((c) => [c.id, c.groupId])
    ).toEqual([
      [X2, PX],
      [X3, PX]
    ]);
  });

  it("AC-19 FR-INT-015 API-INT-015: an unlinked project's sync reads nothing; a task's sync reads its linked task and its project's linked project", async () => {
    const a = await connected();
    const [PY, Y1] = [id(1), id(11)];
    project(PY, "Website");
    task(Y1, PY, "Design");
    task(id(12), PY, "Launch");

    const u = await insertProject(a.id, { title: "Unlinked" });
    await insertTaskRow(a.id, u.id, "Unlinked task");
    let from = fake.calls.length;
    const unlinked = await as(a).post<PreviewBody>("/sync/preview", {
      type: "project",
      id: u.id
    });
    expect(unlinked.status).toBe(200);
    expect(callsSince(from)).toEqual([]);
    expect(unlinked.body.items).toHaveLength(2);
    for (const item of unlinked.body.items) {
      expect(item.candidates, item.key).toBeNull();
    }

    const v = await insertProject(a.id, { title: "Website" });
    await insertLink("project", a.id, v.id, PY);
    const design = await insertTaskRow(a.id, v.id, "Design");
    await insertLink("task", a.id, design.id, Y1);
    from = fake.calls.length;
    const linked = await as(a).post<PreviewBody>("/sync/preview", {
      type: "task",
      id: design.id
    });
    expect(linked.status).toBe(200);
    expect(callsSince(from)).toEqual(
      [`GET /v1/tasks?task=${Y1}`, `GET /v1/projects/${PY}`].sort()
    );

    const loose = await insertTaskRow(a.id, v.id, "Loose");
    from = fake.calls.length;
    const res = await as(a).post<PreviewBody>("/sync/preview", {
      type: "task",
      id: loose.id
    });
    expect(res.status).toBe(200);
    expect(callsSince(from)).toEqual([`GET /v1/projects/${PY}`]);
    expect(byKey(res.body.items)[`task:${loose.id}`].candidates).toBeNull();
    expect(res.body.items.filter((i) => i.parent)).toEqual([]);
  });

  it("AC-20 FR-INT-015 API-INT-010: a day push reads the day, its logs' linked tasks and the linked projects", async () => {
    const a = await connected();
    const [PP, R, A2] = [id(1), id(2), id(11)];
    project(PP, "Platform (PMSPA)");
    project(R, "Website (PMSPA)");
    project(id(3), "Unrelated");
    task(A2, PP, "API (PMSPA)");
    task(id(21), R, "Unrelated task");
    const q = await insertProject(a.id, { title: "Website" });
    const taskA = await insertTaskRow(a.id, q.id, "API");
    const taskB = await insertTaskRow(a.id, q.id, "Forms");
    await insertLink("project", a.id, q.id, R);
    await insertLink("task", a.id, taskA.id, A2);
    await addLog(a, {
      durationMinutes: 60,
      text: "Endpoints",
      projectId: q.id,
      taskId: taskA.id
    });
    await addLog(a, {
      durationMinutes: 30,
      text: "Validation",
      projectId: q.id,
      taskId: taskB.id
    });

    const from = fake.calls.length;
    const res = await as(a).post<PreviewBody>("/push/preview", {
      type: "day",
      id: TODAY
    });

    expect(res.status).toBe(200);
    expect(callsSince(from)).toEqual(
      [
        `GET /v1/days/event.find?start=${TODAY}`,
        `GET /v1/tasks?task=${A2}`,
        `GET /v1/projects/${PP}`,
        `GET /v1/projects/${R}`
      ].sort()
    );
    const items = byKey(res.body.items);
    expect(items[`task:${taskB.id}`]).toMatchObject({
      parentKey: `project:${q.id}`,
      candidates: null
    });
    expect(items[`project:${q.id}`]).toMatchObject({
      linkedId: R,
      parent: false
    });
    expect(items[`event:task:${taskA.id}`].taskPath).toEqual({
      projectTitle: "Platform (PMSPA)",
      taskTitle: "API (PMSPA)"
    });
  });

  it("AC-21 FR-INT-008 API-INT-016: a picked PMSPA record is read by id; gone or already linked → can't be linked", async () => {
    const a = await connected();
    const [K, L] = [id(1), id(2)];
    project(K, "Kiosk");
    project(L, "Ledger");
    project(id(3), "Unrelated");
    const owner = await insertProject(a.id, { title: "Ledger" });
    await insertLink("project", a.id, owner.id, L);

    const sync = (projectId: string, pick: string) =>
      as(a).post<ResultBody>("/sync", {
        target: { type: "project", id: projectId },
        choices: [
          {
            key: `project:${projectId}`,
            kind: "link",
            id: pick,
            overwrite: null
          }
        ]
      });
    const start = fake.calls.length;
    const writes = () =>
      fake.calls.slice(start).filter((c) => c.method !== "GET");

    const solo = await insertProject(a.id, { title: "Solo" });
    const from = fake.calls.length;
    const ok = await sync(solo.id, K);
    expect(ok.status).toBe(200);
    expect(ok.body.items).toEqual([
      expect.objectContaining({ outcome: "linked", reason: null })
    ]);
    expect(callsSince(from)).toEqual([`GET /v1/projects/${K}`]);
    expect(await findLink("project", solo.id)).toEqual({ pmspa_id: K });

    for (const pick of [id(99), L]) {
      const other = await insertProject(a.id, { title: `Solo ${pick}` });
      const res = await sync(other.id, pick);
      expect(res.status, pick).toBe(200);
      expect(res.body.items[0], pick).toMatchObject({
        outcome: "failed",
        reason: "The chosen record can't be linked."
      });
      expect(await findLink("project", other.id), pick).toBeNull();
    }
    expect(writes()).toEqual([]);
  });

  it("AC-22 FR-INT-008 API-INT-019: Link to existing candidates for many PM4 records from one PMSPA list; validation; no connection → 409", async () => {
    const a = await connected();
    const [PX, PB, PG, PL] = [id(1), id(2), id(3), id(4)];
    fake.projects.push({
      id: PX,
      owner: X,
      title: "acme",
      description: "Website relaunch.",
      done: false
    });
    project(PB, "Beta");
    project(PG, "Gamma");
    project(PL, "Linked");
    project(id(5), "Theirs", Y);
    task(id(11), PX, "API");
    task(id(12), PX, "Content");
    task(id(13), PX, "Launch");
    const p1 = await insertProject(a.id, { title: "Acme" });
    const linkedProject = await insertProject(a.id, { title: "Linked" });
    await insertLink("project", a.id, linkedProject.id, PL);
    const t1 = await insertTaskRow(a.id, p1.id, "API");
    const t2 = await insertTaskRow(a.id, p1.id, "Content");
    await insertLink("task", a.id, t1.id, id(11));
    const b = await newUser();
    const theirs = await insertProject(b.id, { title: "Acme" });

    let from = fake.calls.length;
    const projects = await as(a).post<CandidatesBody>("/candidates", {
      type: "project",
      for: [p1.id, theirs.id, randomUUID()]
    });
    expect(projects.status).toBe(200);
    expect(callsSince(from)).toEqual(["GET /v1/projects"]);
    expect(projects.body.items.map((i) => i.pm4Id)).toEqual([p1.id]);
    const [acme, ...rest] = projects.body.items[0].candidates;
    expect([acme, ...rest].map((c) => c.id)).toEqual([PX, PB, PG]);
    expect(acme).toMatchObject({ title: "acme", groupId: null });
    expect(acme.differences.map((d) => d.field)).toContain("Description");

    from = fake.calls.length;
    const tasks = await as(a).post<CandidatesBody>("/candidates", {
      type: "task",
      projectId: PX,
      for: [t2.id]
    });
    expect(tasks.status).toBe(200);
    expect(callsSince(from)).toEqual([`GET /v1/tasks?project=${PX}`]);
    expect(tasks.body.items.map((i) => i.pm4Id)).toEqual([t2.id]);
    expect(
      tasks.body.items[0].candidates.map((c) => [c.id, c.groupId])
    ).toEqual([
      [id(12), PX],
      [id(13), PX]
    ]);

    const foreign = await as(a).post<CandidatesBody>("/candidates", {
      type: "task",
      projectId: id(5),
      for: [t2.id]
    });
    expect(foreign.status).toBe(200);
    expect(foreign.body).toEqual({ items: [{ pm4Id: t2.id, candidates: [] }] });

    from = fake.calls.length;
    const none = await as(a).post<CandidatesBody>("/candidates", {
      type: "project",
      for: [theirs.id]
    });
    expect(none.status).toBe(200);
    expect(none.body).toEqual({ items: [] });
    expect(callsSince(from)).toEqual([]);

    const uuid = randomUUID();
    for (const body of [
      { for: [uuid] },
      { type: "task", for: [uuid] },
      { type: "task", projectId: "abc", for: [uuid] },
      { type: "project", for: [] },
      {
        type: "project",
        for: Array.from({ length: 501 }, () => randomUUID())
      },
      { type: "project", for: [uuid, uuid] },
      { type: "project", for: ["not-a-uuid"] }
    ]) {
      expect(
        (await as(a).post("/candidates", body)).status,
        JSON.stringify(body).slice(0, 80)
      ).toBe(400);
    }

    const stranger = await newUser();
    const own = await insertProject(stranger.id, { title: "Mine" });
    const notConnected = await as(stranger).post<Problem>("/candidates", {
      type: "project",
      for: [own.id]
    });
    expect(notConnected.status).toBe(409);
    expect(notConnected.body.type).toBe(errorType("pmspa-not-connected"));
  });
});
