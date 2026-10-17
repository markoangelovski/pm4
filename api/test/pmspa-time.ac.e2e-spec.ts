import { createHash } from "node:crypto";
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
  type FakePmspaEvent
} from "./support/fake-pmspa.js";
import { insertProject } from "./support/project-test-utils.js";

const errorType = (slug: string) => `${process.env.WEB_APP_URL}/errors/${slug}`;

/** Noon in Zagreb on 2026-10-17: "today" for user A (`Europe/Zagreb`). */
const NOW = new Date("2026-10-17T10:00:00.000Z");
const TODAY = "2026-10-17";

const PMSPA_URL = "https://pmspa.test";
const X = "65f1a0c0ffee00000000000a";

const accountX = (): FakePmspaAccount => ({
  id: X,
  email: "x@pmspa.test",
  password: "secret",
  avatarUrl: null,
  role: "user"
});

// PMSPA ids of account X's projects and tasks.
const P_ANTHROPIC = "66f1a0c0e4b0000000000001";
const P_NVIDIA = "66f1a0c0e4b0000000000002";
const P_ACME = "66f1a0c0e4b0000000000003";
const P_TESLA = "66f1a0c0e4b0000000000004";
const T_ANTHROPIC_PM = "66f1a0c0e4b0000000000011";
const T_MEETINGS = "66f1a0c0e4b0000000000012";
const T_NVIDIA_PM = "66f1a0c0e4b0000000000021";
const T_NVIDIA_DEV = "66f1a0c0e4b0000000000022";
const T_RELEASE = "66f1a0c0e4b0000000000023";
const T_HOMEPAGE = "66f1a0c0e4b0000000000031";
const T_TESLA_MEETINGS = "66f1a0c0e4b0000000000041";
const T_TESLA_QA = "66f1a0c0e4b0000000000042";

/** PMSPA due dates: 30 Oct 2026, 12:00 UTC. */
const DUE = Date.UTC(2026, 9, 30, 12);
/** When the seeded links were last synced. */
const SYNCED_AT = new Date("2026-10-01T08:00:00.000Z");

/** Account X's projects, tasks and days (feat-int-time-api *Acceptance criteria*). */
function seedFake(fake: FakePmspa): void {
  fake.projects = [
    { id: P_ANTHROPIC, owner: X, title: "Anthropic", done: false },
    { id: P_NVIDIA, owner: X, title: "Nvidia", done: false },
    { id: P_ACME, owner: X, title: "Acme Website Relaunch", done: false },
    {
      id: P_TESLA,
      owner: X,
      title: "Tesla",
      description: "QA retainer.",
      done: false
    }
  ];
  const task = (id: string, project: string, title: string) => ({
    id,
    owner: X,
    project,
    title,
    column: "In Progress",
    dueDate: DUE,
    done: false
  });
  fake.tasks = [
    task(T_ANTHROPIC_PM, P_ANTHROPIC, "PM"),
    task(T_MEETINGS, P_ANTHROPIC, "Meetings & demos"),
    task(T_NVIDIA_PM, P_NVIDIA, "PM"),
    task(T_NVIDIA_DEV, P_NVIDIA, "Development"),
    task(T_RELEASE, P_NVIDIA, "Release 4.2 rollout"),
    task(T_HOMEPAGE, P_ACME, "Homepage redesign"),
    task(T_TESLA_MEETINGS, P_TESLA, "Meetings"),
    task(T_TESLA_QA, P_TESLA, "QA")
  ];
  fake.addDay(X, "2026-10-16", 9, [
    {
      title: "Release 4.2 rollout",
      task: T_RELEASE,
      logs: [
        ["Rollout planning", 1.5],
        ["Deploy checks", 0.75]
      ]
    },
    {
      title: "Homepage redesign",
      task: T_HOMEPAGE,
      logs: [["Hero section", 1.5]]
    }
  ]);
  fake.addDay(X, "2026-10-14", 8, [
    { title: "Internal", logs: [["Inbox and planning", 1]] },
    {
      title: "Meetings",
      task: T_TESLA_MEETINGS,
      booked: true,
      logs: [["Client sync", 0.5]]
    },
    { title: "nonprod", logs: [["Sick leave", 0.5]] }
  ]);
  fake.addDay(X, "2026-10-13", 9.25, [
    {
      title: "Development",
      task: T_NVIDIA_DEV,
      logs: [
        ["API work", 2],
        ["Code review", 0.3]
      ]
    }
  ]);
}

/** D1: the first 8 bytes of SHA-256 over the JSON tuple. */
const hash = (tuple: (string | null)[]): Buffer =>
  createHash("sha256").update(JSON.stringify(tuple)).digest().subarray(0, 8);
const STALE = hash(["stale"]);

type LinkType = "project" | "task" | "time-log";
const LINK_TABLE = {
  project: ["pmspa_project_links", "project_id"],
  task: ["pmspa_task_links", "task_id"],
  "time-log": ["pmspa_log_links", "time_log_id"]
} as const;

async function insertLink(
  type: LinkType,
  userId: string,
  pm4Id: string,
  pmspaId: string,
  origin = "linked"
): Promise<void> {
  const [table, column] = LINK_TABLE[type];
  await testDb().query(
    `INSERT INTO ${table}
       (synced_at, origin, ${column}, user_id, pmspa_user_id, pmspa_id, pm4_hash, pmspa_hash)
     VALUES ($1, $2, $3, $4, decode($5, 'hex'), decode($6, 'hex'), $7, $8)`,
    [SYNCED_AT, origin, pm4Id, userId, X, pmspaId, STALE, STALE]
  );
}

interface LinkDbRow {
  pmspa_id: string;
  origin: string;
}

async function findLogLink(timeLogId: string): Promise<LinkDbRow | null> {
  const result = await testDb().query<LinkDbRow>(
    `SELECT encode(pmspa_id, 'hex') AS pmspa_id, origin
     FROM pmspa_log_links WHERE time_log_id = $1`,
    [timeLogId]
  );
  return result.rows[0] ?? null;
}

async function bookingDateOf(timeLogId: string): Promise<string | null> {
  const result = await testDb().query<{ booking_date: string | null }>(
    "SELECT booking_date::text AS booking_date FROM time_logs WHERE id = $1",
    [timeLogId]
  );
  return result.rows[0].booking_date;
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

interface Ref {
  id: string | null;
  title: string;
  deleted: boolean;
}
interface TimeLogBody {
  id: string;
  workDate: string;
  durationMinutes: number;
  text: string;
  title: string | null;
  project: Ref | null;
  task: Ref | null;
  excludeFromStats: boolean;
}
interface WorkdayBody {
  workDate: string;
  startMinute: number | null;
  totalMinutes: number;
  logs: TimeLogBody[];
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
interface PreviewItem {
  key: string;
  parentKey: string | null;
  type: string;
  title: string;
  detail: string | null;
  action: string;
  reason: string | null;
  parent: boolean;
  warnings: string[];
}
interface ResultItem {
  key: string;
  type: string;
  title: string;
  outcome: string;
  reason: string | null;
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

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const byKey = <T extends { key: string }>(items: T[]) =>
  Object.fromEntries(items.map((i) => [i.key, i]));
const ofType = <T extends { type: string }>(items: T[], type: string) =>
  items.filter((i) => i.type === type);

/** The fake's event on `date` with `title` (and `task`, when given). */
const eventOn = (
  fake: FakePmspa,
  date: string,
  title: string,
  task?: string | null
): FakePmspaEvent | undefined =>
  fake
    .eventsOn(date, X)
    .find((e) => e.title === title && (task === undefined || e.task === task));

describe("PMSPA time API (feat-int-time-api)", () => {
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
    fake.accounts = [accountX()];
    seedFake(fake);
    await testRedis().del("pmspa:pause:pmspa.test");
  });

  afterAll(async () => {
    const keys = userIds.flatMap((id) => [
      `pmspa:token:${id}`,
      `pmspa:account:${id}`,
      `pmspa:lock:${id}`
    ]);
    if (keys.length > 0) await testRedis().del(...keys);
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
        ),
      patch: <T>(path: string, body: object) =>
        send<T>(
          request(server)
            .patch(base + path)
            .set("Authorization", auth)
            .send(body)
        ),
      delete: <T>(path: string) =>
        send<T>(
          request(server)
            .delete(base + path)
            .set("Authorization", auth)
        )
    };
  };
  /** PM4's own API (`/api/v1`) as `user`. */
  const pm4 = (user: UserRow) => as(user, "/api/v1");

  /**
   * User A (Europe/Zagreb), connected to X, with feat-int-sync-api's records: Anthropic and Tesla linked, PM Internal
   * not; task Anthropic › Meetings linked to "Meetings & demos".
   */
  const setup = async () => {
    const a = await insertUser();
    userIds.push(a.id);
    const connected = await as(a).put<object>("", {
      url: PMSPA_URL,
      email: "x@pmspa.test",
      password: "secret",
      confirmAccountSwitch: true
    });
    expect(connected.status).toBe(200);
    const anthropic = await insertProject(a.id, { title: "Anthropic" });
    const tesla = await insertProject(a.id, {
      title: "Tesla",
      description: "QA retainer."
    });
    const internal = await insertProject(a.id, { title: "PM Internal" });
    const meetings = await insertTaskRow(a.id, anthropic.id, "Meetings");
    await insertLink("project", a.id, anthropic.id, P_ANTHROPIC, "imported");
    await insertLink("project", a.id, tesla.id, P_TESLA);
    await insertLink("task", a.id, meetings.id, T_MEETINGS, "imported");
    return { a, anthropic, tesla, internal, meetings };
  };

  /** Creates a PM4 log through the API (the date's start 08:00 when it has none). */
  const addLog = async (user: UserRow, fields: Record<string, unknown>) => {
    const res = await pm4(user).post<TimeLogBody>("/time-logs", {
      workDate: TODAY,
      dayStartMinute: 480,
      ...fields
    });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    return res.body;
  };

  /**
   * AC-8: PM4 2026-10-17 starts 08:00 with Anthropic › PM (linked to PMSPA's PM) 60 min, Anthropic › Meetings 30 min,
   * PM Internal 45 min, Unsorted "AI" 15 min, Unsorted untitled 15 min, and 30 min on Nvidia › PM excluded from
   * statistics.
   */
  const pushSetup = async () => {
    const s = await setup();
    const { a, anthropic, internal, meetings } = s;
    const pm = await insertTaskRow(a.id, anthropic.id, "PM");
    await insertLink("task", a.id, pm.id, T_ANTHROPIC_PM);
    const nvidia = await insertProject(a.id, { title: "Nvidia" });
    const nvidiaPm = await insertTaskRow(a.id, nvidia.id, "PM");
    const sprint = await addLog(a, {
      durationMinutes: 60,
      text: "Sprint planning",
      projectId: anthropic.id,
      taskId: pm.id
    });
    const weekly = await addLog(a, {
      durationMinutes: 30,
      text: "Weekly sync",
      projectId: anthropic.id,
      taskId: meetings.id
    });
    const hiring = await addLog(a, {
      durationMinutes: 45,
      text: "Hiring",
      projectId: internal.id
    });
    const prompts = await addLog(a, {
      durationMinutes: 15,
      text: "Prompt tests",
      title: "AI"
    });
    const email = await addLog(a, { durationMinutes: 15, text: "Email" });
    const side = await addLog(a, {
      durationMinutes: 30,
      text: "Side project",
      projectId: nvidia.id,
      taskId: nvidiaPm.id,
      excludeFromStats: true
    });
    return {
      ...s,
      pm,
      nvidiaPm,
      logs: { sprint, weekly, hiring, prompts, email, side }
    };
  };

  const pushPreview = (user: UserRow, date = TODAY) =>
    as(user).post<{ items: PreviewItem[] }>("/push/preview", {
      type: "day",
      id: date
    });
  const push = (user: UserRow, date = TODAY) =>
    as(user).post<{ items: ResultItem[]; syncedAt: string }>("/push", {
      target: { type: "day", id: date },
      choices: []
    });
  const importPreview = (user: UserRow, dates: string[]) =>
    as(user).post<{ items: PreviewItem[] }>("/import/preview", {
      projects: [],
      dates
    });
  const runImport = (user: UserRow, dates: string[]) =>
    as(user).post<{ items: ResultItem[]; syncedAt: string }>("/import", {
      selection: { projects: [], dates },
      choices: []
    });

  /** A push or import a test builds on: it must succeed. */
  const pushed = async (user: UserRow) => {
    const res = await push(user);
    expect(res.status).toBe(200);
  };
  const imported = async (user: UserRow, dates: string[]) => {
    const res = await runImport(user, dates);
    expect(res.status).toBe(200);
  };

  /** Requests that change PMSPA's days so far. */
  const dayWrites = () =>
    fake.calls.filter(
      (c) => c.method !== "GET" && c.path.startsWith("/v1/days/")
    );

  /** The PMSPA log a PM4 log is linked to. */
  const pmspaLogOf = async (timeLogId: string) => {
    const link = await findLogLink(timeLogId);
    return link ? fake.findLog(link.pmspa_id) : undefined;
  };

  it("AC-1 API-INT-007 FR-INT-007: a week of PMSPA days, newest first, with events, tasks and logs in minutes; bad ranges → 400", async () => {
    const { a } = await setup();

    const res = await as(a).get<{ items: PmspaDayBody[] }>(
      "/days?from=2026-10-12&to=2026-10-18"
    );

    expect(res.status).toBe(200);
    expect(
      res.body.items.map((d) => [
        d.date,
        d.startMinute,
        d.totalMinutes,
        d.linkState
      ])
    ).toEqual([
      ["2026-10-16", 540, 225, "not-linked"],
      ["2026-10-14", 480, 120, "not-linked"],
      ["2026-10-13", 555, 138, "not-linked"]
    ]);
    const [d16, d14, d13] = res.body.items;
    const rollout = eventOn(fake, "2026-10-16", "Release 4.2 rollout")!;
    expect(d16.events[0]).toEqual({
      id: rollout.id,
      title: "Release 4.2 rollout",
      task: {
        id: T_RELEASE,
        title: "Release 4.2 rollout",
        projectTitle: "Nvidia"
      },
      booked: false,
      logs: [
        {
          id: rollout.logs[0].id,
          title: "Rollout planning",
          durationMinutes: 90,
          linked: false
        },
        {
          id: rollout.logs[1].id,
          title: "Deploy checks",
          durationMinutes: 45,
          linked: false
        }
      ]
    });
    expect(d16.events[1].task?.projectTitle).toBe("Acme Website Relaunch");
    expect(
      d14.events.map((e) => [e.title, e.task?.title ?? null, e.booked])
    ).toEqual([
      ["Internal", null, false],
      ["Meetings", "Meetings", true],
      ["nonprod", null, false]
    ]);
    expect(d13.events[0].logs.map((l) => l.durationMinutes)).toEqual([120, 18]);

    for (const query of [
      "from=2026-10-11&to=2026-10-18",
      "from=2026-10-18&to=2026-10-12",
      "from=2026-13-01&to=2026-10-18",
      "from=2026-10-12&to=abc",
      "from=2026-10-12"
    ]) {
      expect((await as(a).get(`/days?${query}`)).status, query).toBe(400);
    }
  });

  it("AC-2 API-INT-008 FR-INT-011: an import preview of a day: the events' unlinked tasks as parents, the day row, one row per event; nothing written", async () => {
    const { a } = await setup();

    const res = await importPreview(a, ["2026-10-16"]);

    expect(res.status).toBe(200);
    const items = byKey(res.body.items);
    for (const key of [`task:${T_RELEASE}`, `task:${T_HOMEPAGE}`]) {
      expect(items[key]).toMatchObject({
        type: "task",
        action: "create",
        parent: true,
        reason: "Parent of an imported event"
      });
    }
    expect(items[`task:${T_RELEASE}`].parentKey).toBe(`project:${P_NVIDIA}`);
    expect(items[`task:${T_HOMEPAGE}`].parentKey).toBe(`project:${P_ACME}`);
    expect(items[`project:${P_NVIDIA}`]).toMatchObject({
      action: "create",
      parent: true
    });
    expect(items[`project:${P_ACME}`]).toMatchObject({
      action: "create",
      parent: true
    });

    const keys = res.body.items.map((i) => i.key);
    expect(keys.indexOf("day:2026-10-16")).toBeGreaterThan(
      keys.indexOf(`task:${T_HOMEPAGE}`)
    );
    expect(items["day:2026-10-16"]).toMatchObject({
      type: "day",
      parentKey: null,
      title: "16 Oct 2026",
      detail: "3 logs · 3h 45m",
      action: "create",
      reason: null
    });
    const rollout = eventOn(fake, "2026-10-16", "Release 4.2 rollout")!;
    const homepage = eventOn(fake, "2026-10-16", "Homepage redesign")!;
    const events = ofType(res.body.items, "event");
    expect(events.map((e) => e.key)).toEqual([
      `event:${rollout.id}`,
      `event:${homepage.id}`
    ]);
    expect(events[0]).toMatchObject({
      parentKey: "day:2026-10-16",
      title: "Release 4.2 rollout",
      detail: "Nvidia › Release 4.2 rollout · 2 logs · 2h 15m",
      action: "create",
      warnings: []
    });
    expect(events[1]).toMatchObject({
      parentKey: "day:2026-10-16",
      detail: "Acme Website Relaunch › Homepage redesign · 1 log · 1h 30m",
      action: "create"
    });

    const day = await pm4(a).get<WorkdayBody>("/workdays/2026-10-16");
    expect(day.body.logs).toEqual([]);
    expect(dayWrites()).toEqual([]);
  });

  it("AC-3 API-INT-009 FR-INT-011: importing a day sets the start, maps events to tasks, Unsorted and nonprod, never booked, linked as imported", async () => {
    const { a, tesla } = await setup();

    const run = await runImport(a, ["2026-10-14"]);

    expect(run.status).toBe(200);
    const results = byKey(run.body.items);
    expect(results["day:2026-10-14"].outcome).toBe("created");
    expect(ofType(run.body.items, "event").map((e) => e.outcome)).toEqual([
      "created",
      "created",
      "created"
    ]);

    const day = await pm4(a).get<WorkdayBody>("/workdays/2026-10-14");
    expect(day.body.startMinute).toBe(480);
    const byText = Object.fromEntries(day.body.logs.map((l) => [l.text, l]));
    expect(Object.keys(byText).sort()).toEqual(
      ["Client sync", "Inbox and planning", "Sick leave"].sort()
    );
    expect(byText["Inbox and planning"]).toMatchObject({
      title: "Internal",
      durationMinutes: 60,
      project: null,
      task: null,
      excludeFromStats: false
    });
    expect(byText["Client sync"]).toMatchObject({
      title: "Meetings",
      durationMinutes: 30,
      project: { id: tesla.id, title: "Tesla", deleted: false },
      task: { title: "Meetings", deleted: false },
      excludeFromStats: false
    });
    expect(await bookingDateOf(byText["Client sync"].id)).toBeNull();
    expect(byText["Sick leave"]).toMatchObject({
      title: "nonprod",
      project: null,
      task: null,
      excludeFromStats: true
    });

    const pmspaLogs = fake.eventsOn("2026-10-14", X).flatMap((e) => e.logs);
    for (const l of day.body.logs) {
      const link = await findLogLink(l.id);
      expect(link?.origin).toBe("imported");
      expect(pmspaLogs.find((x) => x.id === link?.pmspa_id)?.title).toBe(
        l.text
      );
    }

    const days = await as(a).get<{ items: PmspaDayBody[] }>(
      "/days?from=2026-10-14&to=2026-10-14"
    );
    expect(days.body.items[0].linkState).toBe("linked");
    expect(
      days.body.items[0].events.flatMap((e) => e.logs).every((l) => l.linked)
    ).toBe(true);
  });

  it("AC-4 API-INT-009 FR-INT-011: a log off the 0.25 h step fails its event with the reason; the other log is imported", async () => {
    const { a } = await setup();

    const run = await runImport(a, ["2026-10-13"]);

    expect(run.status).toBe(200);
    const development = eventOn(fake, "2026-10-13", "Development")!;
    expect(byKey(run.body.items)[`event:${development.id}`]).toMatchObject({
      outcome: "failed",
      reason:
        "A log of 0.3 h isn't in 0.25 h steps (the other 1 log were imported)."
    });
    const day = await pm4(a).get<WorkdayBody>("/workdays/2026-10-13");
    expect(day.body.startMinute).toBe(555);
    expect(day.body.logs.map((l) => [l.text, l.durationMinutes])).toEqual([
      ["API work", 120]
    ]);
    expect(day.body.logs[0].task?.title).toBe("Development");
  });

  it("AC-5 API-INT-008 API-INT-009 FR-INT-011: a day imported again is skipped; a log changed on both sides takes PMSPA's text, with a warning, and keeps its PM4 title", async () => {
    const { a } = await setup();
    await imported(a, ["2026-10-14"]);

    const again = await importPreview(a, ["2026-10-14"]);
    expect(again.status).toBe(200);
    const rows = [
      ...ofType(again.body.items, "day"),
      ...ofType(again.body.items, "event")
    ];
    expect(rows).toHaveLength(4);
    for (const row of rows) {
      expect(row).toMatchObject({ action: "skip", reason: "Already imported" });
    }

    const internal = eventOn(fake, "2026-10-14", "Internal")!;
    internal.logs[0].title = "Inbox, planning and email";
    const day = await pm4(a).get<WorkdayBody>("/workdays/2026-10-14");
    const pm4Log = day.body.logs.find((l) => l.text === "Inbox and planning")!;
    const edited = await pm4(a).patch(`/time-logs/${pm4Log.id}`, {
      text: "Inbox (edited in PM4)",
      title: "My title"
    });
    expect(edited.status).toBe(200);

    const preview = await importPreview(a, ["2026-10-14"]);
    expect(byKey(preview.body.items)[`event:${internal.id}`]).toMatchObject({
      action: "update",
      warnings: [
        "1 log also changed in PM4 since the last sync: PM4's version is overwritten."
      ]
    });

    const run = await runImport(a, ["2026-10-14"]);
    expect(byKey(run.body.items)[`event:${internal.id}`].outcome).toBe(
      "updated"
    );
    const after = await pm4(a).get<WorkdayBody>("/workdays/2026-10-14");
    expect(after.body.logs.find((l) => l.id === pm4Log.id)).toMatchObject({
      text: "Inbox, planning and email",
      title: "My title"
    });
  });

  it("AC-6 API-INT-008 API-INT-009 FR-INT-011: an event moved to another linked task in PMSPA moves its PM4 log, with a warning", async () => {
    const { a, tesla } = await setup();
    const qa = await insertTaskRow(a.id, tesla.id, "QA");
    await insertLink("task", a.id, qa.id, T_TESLA_QA);
    await imported(a, ["2026-10-14"]);
    const meetingsEvent = eventOn(fake, "2026-10-14", "Meetings")!;
    meetingsEvent.task = T_TESLA_QA;

    const preview = await importPreview(a, ["2026-10-14"]);
    expect(preview.status).toBe(200);
    expect(
      byKey(preview.body.items)[`event:${meetingsEvent.id}`]
    ).toMatchObject({
      action: "update",
      warnings: [
        "1 PM4 log moves to “QA” (its task changed in PMSPA).",
        "Booked in PMSPA: imported logs aren't booked."
      ]
    });

    const run = await runImport(a, ["2026-10-14"]);
    expect(byKey(run.body.items)[`event:${meetingsEvent.id}`].outcome).toBe(
      "updated"
    );
    const day = await pm4(a).get<WorkdayBody>("/workdays/2026-10-14");
    expect(day.body.logs.find((l) => l.text === "Client sync")).toMatchObject({
      task: { id: qa.id, title: "QA", deleted: false },
      project: { id: tesla.id, title: "Tesla", deleted: false }
    });
  });

  it("AC-7 API-INT-008 FR-INT-011: a future date is skipped without reading PMSPA's day; more than 7 dates, a repeat or a bad date → 400", async () => {
    const { a } = await setup();

    const res = await importPreview(a, ["2026-10-20"]);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      key: "day:2026-10-20",
      type: "day",
      title: "20 Oct 2026",
      action: "skip",
      reason: "In the future: PM4 doesn't log future time."
    });
    expect(fake.callsTo("GET", "/v1/days/event.find")).toEqual([]);

    const eight = Array.from({ length: 8 }, (_, i) => `2026-10-0${i + 1}`);
    for (const dates of [
      eight,
      ["2026-10-14", "2026-10-14"],
      ["2026-02-30"],
      ["14.10.2026"]
    ]) {
      expect((await importPreview(a, dates)).status, dates.join()).toBe(400);
    }
  });

  it("AC-8 API-INT-010 FR-INT-012: a day push preview: one event per task, project, Unsorted title and nonprod; the excluded log's task isn't a parent", async () => {
    const { a, pm, meetings, internal, nvidiaPm } = await pushSetup();

    const res = await pushPreview(a);

    expect(res.status).toBe(200);
    const items = byKey(res.body.items);
    expect(items[`task:${nvidiaPm.id}`]).toBeUndefined();
    expect(items[`day:${TODAY}`]).toMatchObject({
      type: "day",
      title: "17 Oct 2026",
      detail: "6 events · 6 logs · 3h 15m",
      action: "create"
    });
    const events = ofType(res.body.items, "event");
    expect(events.map((e) => [e.key, e.title])).toEqual([
      [`event:task:${pm.id}`, "Anthropic"],
      [`event:task:${meetings.id}`, "Anthropic"],
      [`event:project:${internal.id}`, "PM Internal"],
      ["event:unsorted:AI · Time", "AI · Time"],
      ["event:unsorted:Unsorted", "Unsorted"],
      ["event:unsorted:nonprod", "nonprod"]
    ]);
    expect(events.map((e) => e.detail)).toEqual([
      "Anthropic › PM · 1 log · 1h",
      "Anthropic › Meetings & demos · 1 log · 30m",
      "No task · 1 log · 45m",
      "No task · 1 log · 15m",
      "No task · 1 log · 15m",
      "No task · Excluded from statistics · 1 log · 30m"
    ]);
    for (const e of events) {
      expect(e).toMatchObject({
        parentKey: `day:${TODAY}`,
        action: "create",
        warnings: []
      });
    }
    expect(dayWrites()).toEqual([]);
  });

  it("AC-9 API-INT-011 FR-INT-012: pushing the day creates the six events with the day's start, each log titled with its text and linked as pushed", async () => {
    const { a, logs } = await pushSetup();

    const res = await push(a);

    expect(res.status).toBe(200);
    expect(res.body.items.map((i) => i.outcome)).toEqual(
      Array<string>(7).fill("created")
    );
    expect(
      fake
        .eventsOn(TODAY, X)
        .map((e) => [
          e.title,
          e.task,
          e.booked,
          e.logs.map((l) => [l.title, l.duration])
        ])
    ).toEqual([
      ["Anthropic", T_ANTHROPIC_PM, false, [["Sprint planning", 1]]],
      ["Anthropic", T_MEETINGS, false, [["Weekly sync", 0.5]]],
      ["PM Internal", null, false, [["Hiring", 0.75]]],
      ["AI · Time", null, false, [["Prompt tests", 0.25]]],
      ["Unsorted", null, false, [["Email", 0.25]]],
      ["nonprod", null, false, [["Side project", 0.5]]]
    ]);
    const creates = fake.callsTo("POST", "/v1/days/event.create");
    expect(creates).toHaveLength(6);
    for (const c of creates) {
      expect(Number((c.body as { start: unknown }).start)).toBe(8);
    }
    expect(fake.dayOn(TODAY, X)?.start).toBe(8);
    for (const l of Object.values(logs)) {
      const link = await findLogLink(l.id);
      expect(link?.origin, l.text).toBe("pushed");
      expect(fake.findLog(link!.pmspa_id)?.log.title).toBe(l.text);
    }
  });

  it("AC-10 API-INT-010 API-INT-011 FR-INT-012: a pushed day is skipped with no PMSPA write; booking a log updates its event's booked flag", async () => {
    const { a, internal, logs } = await pushSetup();
    await pushed(a);
    const writes = dayWrites().length;

    const preview = await pushPreview(a);
    expect(preview.status).toBe(200);
    const rows = [
      ...ofType(preview.body.items, "day"),
      ...ofType(preview.body.items, "event")
    ];
    expect(rows).toHaveLength(7);
    for (const row of rows) {
      expect(row).toMatchObject({
        action: "skip",
        reason: "No changes since the last sync"
      });
    }
    const again = await push(a);
    expect(again.body.items.map((i) => i.outcome)).toEqual(
      Array<string>(7).fill("skipped")
    );
    expect(dayWrites()).toHaveLength(writes);

    const booked = await pm4(a).put("/bookings", {
      logIds: [logs.hiring.id],
      bookingDate: TODAY
    });
    expect(booked.status).toBe(200);
    const key = `event:project:${internal.id}`;
    const changed = await pushPreview(a);
    expect(byKey(changed.body.items)[key].action).toBe("update");
    const run = await push(a);
    expect(byKey(run.body.items)[key].outcome).toBe("updated");
    expect(eventOn(fake, TODAY, "PM Internal")?.booked).toBe(true);
    expect(eventOn(fake, TODAY, "AI · Time")?.booked).toBe(false);
  });

  it("AC-11 API-INT-010 API-INT-011 FR-INT-012: a log moved to another task in PM4 moves to that event in PMSPA; the emptied event is deleted", async () => {
    const { a, anthropic, meetings, logs } = await pushSetup();
    await pushed(a);
    const before = (await findLogLink(logs.sprint.id))!.pmspa_id;
    const moved = await pm4(a).patch(`/time-logs/${logs.sprint.id}`, {
      projectId: anthropic.id,
      taskId: meetings.id
    });
    expect(moved.status).toBe(200);

    const preview = await pushPreview(a);
    expect(
      byKey(preview.body.items)[`event:task:${meetings.id}`]
    ).toMatchObject({
      action: "update",
      warnings: [
        "1 log moves here in PMSPA from another event; an event left empty is deleted."
      ]
    });
    const run = await push(a);

    expect(run.status).toBe(200);
    expect(fake.findLog(before)).toBeUndefined();
    expect(eventOn(fake, TODAY, "Anthropic", T_ANTHROPIC_PM)).toBeUndefined();
    const target = eventOn(fake, TODAY, "Anthropic", T_MEETINGS)!;
    expect(target.logs.map((l) => l.title)).toEqual([
      "Weekly sync",
      "Sprint planning"
    ]);
    const after = await findLogLink(logs.sprint.id);
    expect(after?.pmspa_id).toBe(target.logs[1].id);
    expect(after?.pmspa_id).not.toBe(before);
  });

  it("AC-12 API-INT-010 FR-INT-012: a push that adds no event warns that PMSPA keeps its own start", async () => {
    const { a } = await pushSetup();
    await pushed(a);
    fake.dayOn(TODAY, X)!.start = 9;

    const preview = await pushPreview(a);

    expect(preview.status).toBe(200);
    expect(byKey(preview.body.items)[`day:${TODAY}`].warnings).toEqual([
      "PMSPA keeps 09:00: a day's start changes only when an event is added."
    ]);
  });

  it("AC-13 API-INT-010 API-INT-011 FR-INT-012: a log changed on both sides warns, and the push writes PM4's text", async () => {
    const { a, meetings, logs } = await pushSetup();
    await pushed(a);
    const pmspaLog = (await pmspaLogOf(logs.weekly.id))!.log;
    pmspaLog.title = "Weekly sync (PMSPA)";
    await pm4(a).patch(`/time-logs/${logs.weekly.id}`, {
      text: "Weekly sync with notes"
    });

    const preview = await pushPreview(a);
    expect(
      byKey(preview.body.items)[`event:task:${meetings.id}`]
    ).toMatchObject({
      action: "update",
      warnings: [
        "1 log also changed in PMSPA since the last sync: PMSPA's version is overwritten."
      ]
    });
    const run = await push(a);

    expect(byKey(run.body.items)[`event:task:${meetings.id}`].outcome).toBe(
      "updated"
    );
    expect(pmspaLog.title).toBe("Weekly sync with notes");
  });

  it("AC-14 API-INT-011 FR-INT-012: a log added in PMSPA stays after a push; a log deleted in PM4 leaves its PMSPA log", async () => {
    const { a, logs } = await pushSetup();
    await pushed(a);
    const pmEvent = eventOn(fake, TODAY, "Anthropic", T_ANTHROPIC_PM)!;
    pmEvent.logs.push({
      id: fake.newId(),
      title: "Extra PMSPA work",
      duration: 0.5
    });
    const hiringLog = (await pmspaLogOf(logs.hiring.id))!.log;
    expect((await pm4(a).delete(`/time-logs/${logs.hiring.id}`)).status).toBe(
      204
    );
    await pm4(a).patch(`/time-logs/${logs.sprint.id}`, {
      text: "Sprint planning v2"
    });

    const run = await push(a);

    expect(run.status).toBe(200);
    expect(pmEvent.logs.map((l) => l.title)).toEqual([
      "Sprint planning v2",
      "Extra PMSPA work"
    ]);
    expect(fake.findLog(hiringLog.id)?.event.title).toBe("PM Internal");
  });

  it("AC-15 API-INT-014 FR-INT-010: a time-log link with its PMSPA log and event title, read live; gone in PMSPA → pmspa null", async () => {
    const { a, anthropic, meetings } = await setup();
    const log = await addLog(a, {
      durationMinutes: 60,
      text: "Sprint planning",
      projectId: anthropic.id,
      taskId: meetings.id
    });
    fake.addDay(X, TODAY, 8, [
      { title: "Anthropic", task: T_MEETINGS, logs: [["Sprint planning", 1]] }
    ]);
    const pmspaLog = eventOn(fake, TODAY, "Anthropic")!.logs[0];
    await insertLink("time-log", a.id, log.id, pmspaLog.id, "pushed");

    const res = await as(a).get<object>(`/links/time-log/${log.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      origin: "pushed",
      syncedAt: SYNCED_AT.toISOString(),
      pmspa: {
        type: "time-log",
        title: "Sprint planning",
        eventTitle: "Anthropic"
      }
    });

    eventOn(fake, TODAY, "Anthropic")!.logs = [];
    const gone = await as(a).get<{ pmspa: unknown }>(
      `/links/time-log/${log.id}`
    );
    expect(gone.status).toBe(200);
    expect(gone.body.pmspa).toBeNull();
  });

  it("AC-16 API-INT-010 FR-INT-012: a push preview of a future date → 400; of a day without logs → no rows", async () => {
    const { a } = await setup();

    expect((await pushPreview(a, "2026-10-18")).status).toBe(400);
    const empty = await pushPreview(a, "2026-10-15");
    expect(empty.status).toBe(200);
    expect(empty.body).toEqual({ items: [] });
  });

  it("AC-19 API-INT-011 FR-INT-012: a push while an import runs → 409 pmspa-sync-running; a push without a target or with a bad one → 400", async () => {
    const { a } = await setup();
    fake.latencyMs = 100;

    const [imported, pushed] = await Promise.all([
      runImport(a, ["2026-10-14"]),
      wait(20).then(() =>
        as(a).post<Problem>("/push", {
          target: { type: "day", id: TODAY },
          choices: []
        })
      )
    ]);

    expect(imported.status).toBe(200);
    expect(pushed.status).toBe(409);
    expect(pushed.body.type).toBe(errorType("pmspa-sync-running"));

    fake.latencyMs = 0;
    for (const body of [
      { choices: [] },
      { target: { type: "project", id: TODAY }, choices: [] },
      { target: { type: "day", id: "2026-13-01" }, choices: [] },
      { target: { type: "day", id: "2026-10-18" }, choices: [] }
    ]) {
      expect(
        (await as(a).post("/push", body)).status,
        JSON.stringify(body)
      ).toBe(400);
    }
  });

  it("AC-20 API-INT-010 API-INT-011 FR-INT-012: a pushed log moved to another date is recreated in that day's event; the old event stays even if empty", async () => {
    const { a, internal, logs } = await pushSetup();
    await pushed(a);
    const old = (await findLogLink(logs.hiring.id))!.pmspa_id;
    const moved = await pm4(a).patch(`/time-logs/${logs.hiring.id}`, {
      workDate: "2026-10-16",
      dayStartMinute: 480
    });
    expect(moved.status).toBe(200);

    const preview = await pushPreview(a, "2026-10-16");
    expect(preview.status).toBe(200);
    expect(
      byKey(preview.body.items)[`event:project:${internal.id}`]
    ).toMatchObject({
      action: "update",
      warnings: [
        "1 log moves here in PMSPA from another day; an event left empty there stays."
      ]
    });
    const run = await push(a, "2026-10-16");

    expect(run.status).toBe(200);
    expect(fake.findLog(old)).toBeUndefined();
    const target = eventOn(fake, "2026-10-16", "PM Internal", null)!;
    expect(target.logs.map((l) => [l.title, l.duration])).toEqual([
      ["Hiring", 0.75]
    ]);
    expect((await findLogLink(logs.hiring.id))?.pmspa_id).toBe(
      target.logs[0].id
    );
    expect(eventOn(fake, TODAY, "PM Internal", null)?.logs).toEqual([]);
  });

  it("AC-21 API-INT-010 API-INT-014 FR-INT-010: another user's time-log link is 404, and their push preview doesn't see the first user's logs", async () => {
    const { a, anthropic, meetings } = await setup();
    const { a: b } = await setup();
    const log = await addLog(a, {
      durationMinutes: 60,
      text: "Sprint planning",
      projectId: anthropic.id,
      taskId: meetings.id
    });
    fake.addDay(X, TODAY, 8, [
      { title: "Anthropic", task: T_MEETINGS, logs: [["Sprint planning", 1]] }
    ]);
    const pmspaLog = eventOn(fake, TODAY, "Anthropic")!.logs[0];
    await insertLink("time-log", a.id, log.id, pmspaLog.id, "pushed");

    expect((await as(b).get(`/links/time-log/${log.id}`)).status).toBe(404);
    const preview = await pushPreview(b, TODAY);
    expect(preview.status).toBe(200);
    expect(preview.body).toEqual({ items: [] });
  });
});
