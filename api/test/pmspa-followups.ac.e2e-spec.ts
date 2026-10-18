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
  type FakePmspaAccount
} from "./support/fake-pmspa.js";
import { insertProject } from "./support/project-test-utils.js";

const errorType = (slug: string) => `${process.env.WEB_APP_URL}/errors/${slug}`;

/** Noon in Zagreb on 2026-10-17: "today" for the test users (`Europe/Zagreb`). */
const NOW = new Date("2026-10-17T10:00:00.000Z");
const DAY = "2026-10-15";

const PMSPA_URL = "https://pmspa.test";
const X = "65f1a0c0ffee00000000000a";
const Y = "65f1a0c0ffee00000000000b";

const accountX = (): FakePmspaAccount => ({
  id: X,
  email: "x@pmspa.test",
  password: "secret",
  avatarUrl: null,
  role: "user"
});

const P_ANTHROPIC = "66f1a0c0e4b0000000000001";
/** PMSPA ids created on 2023-10-06T12:38:08Z (first 4 bytes `651fffb0`, D2). */
const CREATED_PROJECT = "651fffb0e4b0000000000101";
const CREATED_TASK = "651fffb0e4b0000000000102";
const CREATED_LOG = "651fffb0e4b0000000000103";
const CREATED_AT = "2023-10-06T12:38:08.000Z";

const STALE = createHash("sha256")
  .update(JSON.stringify(["stale"]))
  .digest()
  .subarray(0, 8);
const SYNCED_AT = new Date("2026-10-01T08:00:00.000Z");

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

async function countLinks(userId: string): Promise<number> {
  let total = 0;
  for (const [table] of Object.values(LINK_TABLE)) {
    const result = await testDb().query<{ n: number }>(
      `SELECT count(*)::int AS n FROM ${table} WHERE user_id = $1`,
      [userId]
    );
    total += result.rows[0].n;
  }
  return total;
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

interface PreviewItem {
  key: string;
  type: string;
  title: string;
  warnings: string[];
}
interface LinkBody {
  pm4Id: string;
  pmspaCreatedAt: string;
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

describe("PMSPA follow-ups (feat-int-followups)", () => {
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
    fake.projects = [
      { id: P_ANTHROPIC, owner: X, title: "Anthropic", done: false }
    ];
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
        )
    };
  };

  /** A user connected to account X. */
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
    return a;
  };

  it("AC-1 API-INT-008 FR-INT-011: the import preview warns, in order, for each log the import will reject; a log without text isn't warned", async () => {
    const a = await setup();
    fake.addDay(X, DAY, 9, [
      {
        title: "Development",
        logs: [
          ["Code review", 0.3],
          ["Nothing", 0],
          ["Marathon", 25],
          ["x".repeat(1001), 1],
          ["Fixed.", 1.5]
        ]
      },
      { title: "Internal", logs: [["", 1]] }
    ]);

    const res = await as(a).post<{ items: PreviewItem[] }>("/import/preview", {
      projects: [],
      dates: [DAY]
    });

    expect(res.status).toBe(200);
    const events = res.body.items.filter((i) => i.type === "event");
    expect(events.map((e) => e.title)).toEqual(["Development", "Internal"]);
    expect(events[0].warnings.slice(0, 3)).toEqual([
      "1 log of 0.3 h isn't in 0.25 h steps and will fail.",
      "2 logs of 0 h, 25 h isn't between 0.25 h and 24 h and will fail.",
      "1 log with a text over 1000 characters will fail."
    ]);
    expect(events[1].warnings.filter((w) => w.includes("will fail"))).toEqual(
      []
    );
  });

  it("AC-2 API-INT-012 FR-INT-010: each link has pmspaCreatedAt from its PMSPA id, for every type, without a PMSPA call", async () => {
    const a = await setup();
    const project = await insertProject(a.id, { title: "Anthropic" });
    const task = await insertTaskRow(a.id, project.id, "PM");
    const log = await send<{ id: string }>(
      request(app.getHttpServer())
        .post("/api/v1/time-logs")
        .set("Authorization", `Bearer ${accessTokenFor(a.id)}`)
        .send({
          workDate: DAY,
          dayStartMinute: 480,
          durationMinutes: 60,
          text: "Sprint planning",
          projectId: project.id,
          taskId: task.id
        })
    );
    expect(log.status).toBe(201);
    await insertLink("project", a.id, project.id, CREATED_PROJECT);
    await insertLink("task", a.id, task.id, CREATED_TASK);
    await insertLink("time-log", a.id, log.body.id, CREATED_LOG);
    const callsBefore = fake.calls.length;

    for (const [type, pm4Id] of [
      ["project", project.id],
      ["task", task.id],
      ["time-log", log.body.id]
    ] as const) {
      const res = await as(a).get<{ items: LinkBody[] }>(`/links?type=${type}`);
      expect(res.status).toBe(200);
      expect(res.body.items).toEqual([
        expect.objectContaining({ pm4Id, pmspaCreatedAt: CREATED_AT })
      ]);
    }
    expect(fake.calls.length).toBe(callsBefore);
  });

  it("AC-3 API-INT-005 FR-INT-003: a re-login that answers another account is invalid credentials; nothing cached; the links stay", async () => {
    const a = await setup();
    const project = await insertProject(a.id, { title: "Anthropic" });
    await insertLink("project", a.id, project.id, P_ANTHROPIC);
    // The saved email now logs in as account Y, and the cached token expired.
    fake.accounts = [{ ...accountX(), id: Y }];
    fake.expireTokens();

    const res = await as(a).get<Problem>("/projects");

    expect(res.status).toBe(409);
    expect(res.body.type).toBe(errorType("pmspa-invalid-credentials"));
    const conn = await as(a).get<{ status: string; account: unknown }>("");
    expect(conn.body).toMatchObject({
      status: "invalid-credentials",
      account: null
    });
    expect(await testRedis().exists(`pmspa:token:${a.id}`)).toBe(0);
    expect(await testRedis().exists(`pmspa:account:${a.id}`)).toBe(0);
    expect(await countLinks(a.id)).toBe(1);
  });
});
