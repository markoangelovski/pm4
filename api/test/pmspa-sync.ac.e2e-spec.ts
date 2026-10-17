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
  type FakePmspaAccount
} from "./support/fake-pmspa.js";
import {
  findProjectRow,
  insertProject,
  type ProjectDbRow,
  type TaskStatusValue
} from "./support/project-test-utils.js";

const errorType = (slug: string) => `${process.env.WEB_APP_URL}/errors/${slug}`;

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
const accountY = (): FakePmspaAccount => ({
  id: Y,
  email: "y@pmspa.test",
  password: "secret",
  avatarUrl: null,
  role: "user"
});

// PMSPA ids of account X's records (and Y's "Other").
const P_ANTHROPIC = "66f1a0c0e4b0000000000001";
const P_NVIDIA = "66f1a0c0e4b0000000000002";
const P_ACME = "66f1a0c0e4b0000000000003";
const P_TESLA = "66f1a0c0e4b0000000000004";
const P_ARCHIVE = "66f1a0c0e4b0000000000005";
const P_OTHER = "66f1a0c0e4b0000000000006";
const T_ANTHROPIC_PM = "66f1a0c0e4b0000000000011";
const T_MEETINGS = "66f1a0c0e4b0000000000012";
const T_NVIDIA_PM = "66f1a0c0e4b0000000000021";
const T_NVIDIA_DEV = "66f1a0c0e4b0000000000022";
const T_ACME = [
  "66f1a0c0e4b0000000000031",
  "66f1a0c0e4b0000000000032",
  "66f1a0c0e4b0000000000033",
  "66f1a0c0e4b0000000000034",
  "66f1a0c0e4b0000000000035"
];

/** PMSPA due dates: 30 Oct 2026, 12:00 UTC. */
const DUE = Date.UTC(2026, 9, 30, 12);
/** When the seeded links were last synced. */
const SYNCED_AT = new Date("2026-10-01T08:00:00.000Z");

const ACME_DESCRIPTION = "Relaunch of the Acme website.";
const ACME_LINK = "https://kanboard.example.com/project/42";

/** The fake's records (feat-int-sync-api *Acceptance criteria*). */
function seedFake(fake: FakePmspa): void {
  fake.projects = [
    { id: P_ANTHROPIC, owner: X, title: "Anthropic", done: false },
    { id: P_NVIDIA, owner: X, title: "Nvidia", done: false },
    {
      id: P_ACME,
      owner: X,
      title: "Acme Website Relaunch",
      description: ACME_DESCRIPTION,
      pl: "Jane Doe",
      kanboard: ACME_LINK,
      done: false
    },
    {
      id: P_TESLA,
      owner: X,
      title: "Tesla",
      description: "QA retainer.",
      done: false
    },
    { id: P_ARCHIVE, owner: X, title: "Archive 2025", done: true },
    { id: P_OTHER, owner: Y, title: "Other", done: false }
  ];
  const task = (
    id: string,
    project: string,
    title: string,
    column = "Upcoming",
    extra: { description?: string } = {}
  ) => ({
    id,
    owner: X,
    project,
    title,
    column,
    dueDate: DUE,
    done: column === "Completed",
    ...extra
  });
  fake.tasks = [
    task(T_ANTHROPIC_PM, P_ANTHROPIC, "PM"),
    task(T_MEETINGS, P_ANTHROPIC, "Meetings & demos", "In Progress", {
      description: "Client calls and demos."
    }),
    task(T_NVIDIA_PM, P_NVIDIA, "PM"),
    task(T_NVIDIA_DEV, P_NVIDIA, "Development", "In Progress"),
    task(T_ACME[0], P_ACME, "Design", "Completed"),
    task(T_ACME[1], P_ACME, "Content", "In Progress"),
    task(T_ACME[2], P_ACME, "Development", "In Progress"),
    task(T_ACME[3], P_ACME, "QA"),
    task(T_ACME[4], P_ACME, "Launch")
  ];
}

/** D1: the first 8 bytes of SHA-256 over the JSON tuple. */
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
  pmspaId: string,
  fields: { origin: string; pm4Hash: Buffer; pmspaHash: Buffer }
): Promise<void> {
  const [table, column] = LINK_TABLE[type];
  await testDb().query(
    `INSERT INTO ${table}
       (synced_at, origin, ${column}, user_id, pmspa_user_id, pmspa_id, pm4_hash, pmspa_hash)
     VALUES ($1, $2, $3, $4, decode($5, 'hex'), decode($6, 'hex'), $7, $8)`,
    [
      SYNCED_AT,
      fields.origin,
      pm4Id,
      userId,
      X,
      pmspaId,
      fields.pm4Hash,
      fields.pmspaHash
    ]
  );
}

interface LinkDbRow {
  pm4_id: string;
  pmspa_id: string;
  origin: string;
  synced_at: Date;
  pm4_hash: Buffer;
  pmspa_hash: Buffer;
}

async function findLink(
  type: LinkType,
  pm4Id: string
): Promise<LinkDbRow | null> {
  const [table, column] = LINK_TABLE[type];
  const result = await testDb().query<LinkDbRow>(
    `SELECT ${column} AS pm4_id, encode(pmspa_id, 'hex') AS pmspa_id, origin,
            synced_at, pm4_hash, pmspa_hash
     FROM ${table} WHERE ${column} = $1`,
    [pm4Id]
  );
  return result.rows[0] ?? null;
}

interface TaskRow {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatusValue;
  due_date: string | null;
}

async function insertTaskRow(
  userId: string,
  projectId: string,
  fields: {
    title: string;
    status?: TaskStatusValue;
    description?: string;
    dueDate?: string;
  }
): Promise<TaskRow> {
  const result = await testDb().query<TaskRow>(
    `INSERT INTO tasks (user_id, project_id, title, status, description, due_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, project_id, title, description, status, due_date::text AS due_date`,
    [
      userId,
      projectId,
      fields.title,
      fields.status ?? "upcoming",
      fields.description ?? null,
      fields.dueDate ?? null
    ]
  );
  return result.rows[0];
}

async function findTask(id: string): Promise<TaskRow | null> {
  const result = await testDb().query<TaskRow>(
    `SELECT id, project_id, title, description, status, due_date::text AS due_date
     FROM tasks WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

async function tasksOf(projectId: string): Promise<TaskRow[]> {
  const result = await testDb().query<TaskRow>(
    `SELECT id, project_id, title, description, status, due_date::text AS due_date
     FROM tasks WHERE project_id = $1`,
    [projectId]
  );
  return result.rows;
}

async function projectsTitled(
  userId: string,
  title: string
): Promise<ProjectDbRow[]> {
  const result = await testDb().query<ProjectDbRow>(
    "SELECT * FROM projects WHERE user_id = $1 AND title = $2",
    [userId, title]
  );
  return result.rows;
}

async function countProjects(userId: string): Promise<number> {
  const result = await testDb().query<{ n: number }>(
    "SELECT count(*)::int AS n FROM projects WHERE user_id = $1",
    [userId]
  );
  return result.rows[0].n;
}

interface Diff {
  field: string;
  pm4: string | null;
  pmspa: string | null;
}
interface Candidate {
  id: string;
  title: string;
  groupId: string | null;
  detail: string | null;
  differences: Diff[];
}
interface PreviewItem {
  key: string;
  parentKey: string | null;
  type: string;
  title: string;
  detail: string | null;
  action: string;
  direction: string | null;
  reason: string | null;
  linkedId: string | null;
  parent: boolean;
  optional: boolean;
  candidates: Candidate[];
  differences: Diff[];
  warnings: string[];
}
interface ResultItem {
  key: string;
  parentKey: string | null;
  type: string;
  title: string;
  newTitle: string | null;
  outcome: string;
  reason: string | null;
}
interface RecordLink {
  pm4Id: string;
  pm4Title: string;
  origin: string;
  syncedAt: string;
}
interface PmspaProjectBody {
  id: string;
  title: string;
  done: boolean;
  taskCount: number;
  link: RecordLink | null;
}
interface PmspaTaskBody {
  id: string;
  projectId: string;
  title: string;
  column: string;
  link: RecordLink | null;
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

describe("PMSPA sync API (feat-int-sync-api)", () => {
  let app: NestExpressApplication;
  let fake: FakePmspa;
  const userIds: string[] = [];

  const freshFake = () => {
    fake = new FakePmspa();
    fake.accounts = [accountX(), accountY()];
    seedFake(fake);
  };

  beforeAll(async () => {
    // The app keeps one fetch; it forwards to the current test's fake.
    const fetchViaFake: typeof globalThis.fetch = (input, init) =>
      fake.fetch(input, init);
    app = await createTestApp([
      { provide: PMSPA_FETCH, useValue: fetchViaFake },
      { provide: DNS_LOOKUP, useValue: fakeLookup }
    ]);
  });

  beforeEach(async () => {
    freshFake();
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
  });

  const newUser = async (): Promise<UserRow> => {
    const user = await insertUser();
    userIds.push(user.id);
    return user;
  };

  /** Supertest under `/api/v1/integrations/pmspa` with `user`'s bearer token. */
  const as = (user: UserRow) => {
    const server = app.getHttpServer();
    const auth = `Bearer ${accessTokenFor(user.id)}`;
    const base = "/api/v1/integrations/pmspa";
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
      delete: <T>(path: string) =>
        send<T>(
          request(server)
            .delete(base + path)
            .set("Authorization", auth)
        )
    };
  };

  const connect = async (user: UserRow, email = "x@pmspa.test") => {
    const res = await as(user).put<object>("", {
      url: PMSPA_URL,
      email,
      password: "secret",
      confirmAccountSwitch: true
    });
    expect(res.status).toBe(200);
  };

  /**
   * User A (Europe/Zagreb), connected to X: Anthropic (linked to X's Anthropic, imported, both hashes current), Tesla
   * (linked, PMSPA hash from before the description), PM Internal (no link); task Anthropic › Meetings (linked to
   * "Meetings & demos", both hashes stale).
   */
  const setup = async () => {
    const a = await newUser();
    await connect(a);
    const anthropic = await insertProject(a.id, { title: "Anthropic" });
    const tesla = await insertProject(a.id, { title: "Tesla" });
    const internal = await insertProject(a.id, { title: "PM Internal" });
    const meetings = await insertTaskRow(a.id, anthropic.id, {
      title: "Meetings",
      description: "Client calls."
    });
    const anthropicTuple = ["Anthropic", null, null, null];
    await insertLink("project", a.id, anthropic.id, P_ANTHROPIC, {
      origin: "imported",
      pm4Hash: hash(anthropicTuple),
      pmspaHash: hash(anthropicTuple)
    });
    const teslaBefore = ["Tesla", null, null, null];
    await insertLink("project", a.id, tesla.id, P_TESLA, {
      origin: "linked",
      pm4Hash: hash(teslaBefore),
      pmspaHash: hash(teslaBefore)
    });
    await insertLink("task", a.id, meetings.id, T_MEETINGS, {
      origin: "imported",
      pm4Hash: STALE,
      pmspaHash: STALE
    });
    return { a, anthropic, tesla, internal, meetings };
  };

  /** POST and PATCH requests to PMSPA's projects and tasks so far. */
  const pmspaWrites = () =>
    fake.calls.filter(
      (c) =>
        c.method !== "GET" &&
        (c.path.startsWith("/v1/projects") || c.path.startsWith("/v1/tasks"))
    );

  const byKey = (items: ResultItem[]) =>
    Object.fromEntries(items.map((i) => [i.key, i]));

  it("AC-1 API-INT-005 FR-INT-007: the connected account's projects by title, with links, done and PMSPA's task count; never another account's", async () => {
    const { a, anthropic, tesla } = await setup();
    fake.pageSize = 2;

    const res = await as(a).get<{ items: PmspaProjectBody[] }>("/projects");

    expect(res.status).toBe(200);
    expect(res.body.items.map((p) => p.title)).toEqual([
      "Acme Website Relaunch",
      "Anthropic",
      "Archive 2025",
      "Nvidia",
      "Tesla"
    ]);
    const byTitle = Object.fromEntries(res.body.items.map((p) => [p.title, p]));
    expect(byTitle.Anthropic).toEqual({
      id: P_ANTHROPIC,
      title: "Anthropic",
      done: false,
      taskCount: 2,
      link: {
        pm4Id: anthropic.id,
        pm4Title: "Anthropic",
        origin: "imported",
        syncedAt: SYNCED_AT.toISOString()
      }
    });
    expect(byTitle.Tesla.link).toEqual({
      pm4Id: tesla.id,
      pm4Title: "Tesla",
      origin: "linked",
      syncedAt: SYNCED_AT.toISOString()
    });
    expect(byTitle["Archive 2025"]).toEqual({
      id: P_ARCHIVE,
      title: "Archive 2025",
      done: true,
      taskCount: 0,
      link: null
    });
    expect(byTitle["Acme Website Relaunch"]).toMatchObject({
      taskCount: 5,
      link: null
    });
  });

  it("AC-2 API-INT-006 FR-INT-007: a project's tasks with links; none → []; another account's project → 404; bad id → 400; no connection → 409", async () => {
    const { a, meetings } = await setup();

    const tasks = await as(a).get<{ items: PmspaTaskBody[] }>(
      `/projects/${P_ANTHROPIC}/tasks`
    );
    expect(tasks.status).toBe(200);
    expect(tasks.body.items).toEqual([
      {
        id: T_ANTHROPIC_PM,
        projectId: P_ANTHROPIC,
        title: "PM",
        column: "Upcoming",
        link: null
      },
      {
        id: T_MEETINGS,
        projectId: P_ANTHROPIC,
        title: "Meetings & demos",
        column: "In Progress",
        link: {
          pm4Id: meetings.id,
          pm4Title: "Meetings",
          origin: "imported",
          syncedAt: SYNCED_AT.toISOString()
        }
      }
    ]);

    const empty = await as(a).get<{ items: PmspaTaskBody[] }>(
      `/projects/${P_ARCHIVE}/tasks`
    );
    expect(empty.status).toBe(200);
    expect(empty.body).toEqual({ items: [] });

    expect((await as(a).get(`/projects/${P_OTHER}/tasks`)).status).toBe(404);
    expect((await as(a).get("/projects/abc/tasks")).status).toBe(400);

    const stranger = await newUser();
    const notConnected = await as(stranger).get<Problem>(
      `/projects/${P_ANTHROPIC}/tasks`
    );
    expect(notConnected.status).toBe(409);
    expect(notConnected.body.type).toBe(errorType("pmspa-not-connected"));
  });

  it("AC-3 API-INT-012 FR-INT-010: the active links of a type; none after switching to another account; bad type → 400", async () => {
    const { a, anthropic, tesla } = await setup();

    const res = await as(a).get<{ items: object[] }>("/links?type=project");
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items).toEqual(
      expect.arrayContaining([
        {
          pm4Id: anthropic.id,
          origin: "imported",
          syncedAt: SYNCED_AT.toISOString()
        },
        {
          pm4Id: tesla.id,
          origin: "linked",
          syncedAt: SYNCED_AT.toISOString()
        }
      ])
    );

    await connect(a, "y@pmspa.test");
    const afterSwitch = await as(a).get<{ items: object[] }>(
      "/links?type=project"
    );
    expect(afterSwitch.status).toBe(200);
    expect(afterSwitch.body).toEqual({ items: [] });

    expect((await as(a).get("/links?type=foo")).status).toBe(400);
  });

  it("AC-4 API-INT-014 FR-INT-010: a link with its PMSPA project read live; gone in PMSPA → pmspa null; no link → 404", async () => {
    const { a, tesla, internal } = await setup();

    const res = await as(a).get<object>(`/links/project/${tesla.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      origin: "linked",
      syncedAt: SYNCED_AT.toISOString(),
      pmspa: { type: "project", title: "Tesla", lead: "", done: false }
    });

    fake.projects = fake.projects.filter((p) => p.id !== P_TESLA);
    const gone = await as(a).get<{ pmspa: unknown }>(
      `/links/project/${tesla.id}`
    );
    expect(gone.status).toBe(200);
    expect(gone.body.pmspa).toBeNull();

    expect((await as(a).get(`/links/project/${internal.id}`)).status).toBe(404);
  });

  it("AC-5 API-INT-013 FR-INT-010: unlinking keeps both records; a second unlink → 404", async () => {
    const { a, tesla } = await setup();

    const res = await as(a).delete(`/links/project/${tesla.id}`);
    expect(res.status).toBe(204);

    expect(await findProjectRow(tesla.id)).not.toBeNull();
    expect(fake.projects.some((p) => p.id === P_TESLA)).toBe(true);
    const links = await as(a).get<{ items: { pm4Id: string }[] }>(
      "/links?type=project"
    );
    expect(links.body.items.map((l) => l.pm4Id)).not.toContain(tesla.id);

    expect((await as(a).delete(`/links/project/${tesla.id}`)).status).toBe(404);
  });

  it("AC-6 API-INT-008 FR-INT-011: an import preview of a new project: a create row with PM4 candidates, then its tasks; nothing written", async () => {
    const { a, internal } = await setup();
    const projectsBefore = await countProjects(a.id);

    const res = await as(a).post<{ items: PreviewItem[] }>("/import/preview", {
      projects: [{ id: P_ACME, taskIds: null }]
    });

    expect(res.status).toBe(200);
    const [project, ...tasks] = res.body.items;
    expect(project).toMatchObject({
      key: `project:${P_ACME}`,
      parentKey: null,
      type: "project",
      title: "Acme Website Relaunch",
      detail: "Lead Jane Doe",
      action: "create",
      direction: "to-pm4",
      linkedId: null
    });
    expect(project.candidates.map((c) => c.id)).toEqual([internal.id]);
    expect(tasks.map((t) => t.key)).toEqual(T_ACME.map((id) => `task:${id}`));
    for (const t of tasks) {
      expect(t).toMatchObject({
        type: "task",
        parentKey: `project:${P_ACME}`,
        action: "create",
        direction: "to-pm4"
      });
    }
    expect(await countProjects(a.id)).toBe(projectsBefore);
    expect(pmspaWrites()).toEqual([]);
  });

  it("AC-7 API-INT-009 FR-INT-011: importing a new project creates it and its tasks in PM4, linked as imported; lastSyncAt = syncedAt", async () => {
    const { a } = await setup();

    const res = await as(a).post<{ items: ResultItem[]; syncedAt: string }>(
      "/import",
      { selection: { projects: [{ id: P_ACME, taskIds: null }] }, choices: [] }
    );

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(6);
    expect(res.body.items.map((i) => i.outcome)).toEqual(
      Array<string>(6).fill("created")
    );
    const [project] = await projectsTitled(a.id, "Acme Website Relaunch");
    expect(project).toMatchObject({
      description: ACME_DESCRIPTION,
      project_lead: "Jane Doe",
      project_lead_user_id: null,
      external_link: ACME_LINK
    });
    const tasks = await tasksOf(project.id);
    expect(tasks.map((t) => t.title).sort()).toEqual(
      ["Content", "Design", "Development", "Launch", "QA"].sort()
    );
    expect(await findLink("project", project.id)).toMatchObject({
      pmspa_id: P_ACME,
      origin: "imported"
    });
    for (const t of tasks) {
      expect((await findLink("task", t.id))?.origin).toBe("imported");
    }

    const connection = await as(a).get<{ lastSyncAt: string }>("");
    expect(connection.body.lastSyncAt).toBe(res.body.syncedAt);
  });

  it("AC-8 API-INT-008 API-INT-009 FR-INT-011: importing the same project again → every row up to date; nothing is created", async () => {
    const { a } = await setup();
    const selection = { projects: [{ id: P_ACME, taskIds: null }] };
    await as(a).post("/import", { selection, choices: [] });
    const writes = pmspaWrites().length;

    const preview = await as(a).post<{ items: PreviewItem[] }>(
      "/import/preview",
      selection
    );
    expect(preview.status).toBe(200);
    expect(preview.body.items).toHaveLength(6);
    for (const item of preview.body.items) {
      expect(item).toMatchObject({
        action: "skip",
        reason: "Same in PM4 and PMSPA"
      });
    }

    const run = await as(a).post<{ items: ResultItem[] }>("/import", {
      selection,
      choices: []
    });
    expect(run.status).toBe(200);
    expect(run.body.items.map((i) => i.outcome)).toEqual(
      Array<string>(6).fill("skipped")
    );
    expect(await projectsTitled(a.id, "Acme Website Relaunch")).toHaveLength(1);
    expect(pmspaWrites()).toHaveLength(writes);
  });

  it("AC-9 API-INT-008 API-INT-009 FR-INT-008: a linked project changed in PMSPA → differs to-pm4; importing it updates PM4", async () => {
    const { a, tesla } = await setup();
    const selection = { projects: [{ id: P_TESLA, taskIds: null }] };

    const preview = await as(a).post<{ items: PreviewItem[] }>(
      "/import/preview",
      selection
    );
    expect(preview.status).toBe(200);
    expect(preview.body.items).toHaveLength(1);
    expect(preview.body.items[0]).toMatchObject({
      key: `project:${P_TESLA}`,
      action: "differs",
      direction: "to-pm4",
      reason: "Changed in PMSPA since the last sync",
      linkedId: tesla.id,
      differences: [{ field: "Description", pm4: null, pmspa: "QA retainer." }]
    });

    const run = await as(a).post<{ items: ResultItem[] }>("/import", {
      selection,
      choices: []
    });
    expect(run.status).toBe(200);
    expect(run.body.items[0].outcome).toBe("updated");
    expect((await findProjectRow(tesla.id))?.description).toBe("QA retainer.");
    const link = await findLink("project", tesla.id);
    const now = hash(["Tesla", "QA retainer.", null, null]);
    expect(link?.pm4_hash.equals(now)).toBe(true);
    expect(link?.pmspa_hash.equals(now)).toBe(true);
  });

  it("AC-10 API-INT-015 API-INT-016 FR-INT-008: a task changed on both sides differs with no suggestion; the default is Link only and writes nothing", async () => {
    const { a, anthropic, meetings } = await setup();

    const preview = await as(a).post<{ items: PreviewItem[] }>(
      "/sync/preview",
      { type: "task", id: meetings.id }
    );
    expect(preview.status).toBe(200);
    expect(preview.body.items).toHaveLength(2);
    expect(preview.body.items[0]).toMatchObject({
      key: `project:${anthropic.id}`,
      type: "project",
      action: "skip",
      linkedId: P_ANTHROPIC
    });
    expect(preview.body.items[1]).toMatchObject({
      key: `task:${meetings.id}`,
      parentKey: `project:${anthropic.id}`,
      type: "task",
      action: "differs",
      direction: null,
      reason: "Changed on both sides since the last sync",
      linkedId: T_MEETINGS,
      differences: [
        { field: "Title", pm4: "Meetings", pmspa: "Meetings & demos" },
        {
          field: "Description",
          pm4: "Client calls.",
          pmspa: "Client calls and demos."
        },
        { field: "Status", pm4: "Upcoming", pmspa: "In Progress" }
      ]
    });

    const run = await as(a).post<{ items: ResultItem[] }>("/sync", {
      target: { type: "task", id: meetings.id },
      choices: []
    });
    expect(run.status).toBe(200);
    expect(byKey(run.body.items)[`task:${meetings.id}`]).toMatchObject({
      outcome: "skipped",
      reason: "Link only: both kept as they are",
      newTitle: null
    });
    expect((await findTask(meetings.id))?.title).toBe("Meetings");
    expect(fake.tasks.find((t) => t.id === T_MEETINGS)?.title).toBe(
      "Meetings & demos"
    );
    expect(pmspaWrites()).toEqual([]);
    expect((await findLink("task", meetings.id))?.synced_at).toEqual(SYNCED_AT);
  });

  it("AC-11 API-INT-016 FR-INT-008: Overwrite PMSPA writes PM4's version (newTitle null); Overwrite PM4 writes PMSPA's (newTitle = the new title)", async () => {
    const first = await setup();
    const toPmspa = await as(first.a).post<{ items: ResultItem[] }>("/sync", {
      target: { type: "task", id: first.meetings.id },
      choices: [
        {
          key: `task:${first.meetings.id}`,
          kind: "link",
          id: T_MEETINGS,
          overwrite: "to-pmspa"
        }
      ]
    });
    expect(toPmspa.status).toBe(200);
    expect(
      byKey(toPmspa.body.items)[`task:${first.meetings.id}`]
    ).toMatchObject({
      outcome: "updated",
      reason: "PMSPA overwritten with PM4's version",
      newTitle: null
    });
    expect(fake.tasks.find((t) => t.id === T_MEETINGS)).toMatchObject({
      title: "Meetings",
      description: "Client calls.",
      column: "Upcoming"
    });
    expect((await findTask(first.meetings.id))?.title).toBe("Meetings");
    const link = await findLink("task", first.meetings.id);
    expect(link?.synced_at.getTime()).toBeGreaterThan(SYNCED_AT.getTime());

    freshFake();
    const second = await setup();
    const toPm4 = await as(second.a).post<{ items: ResultItem[] }>("/sync", {
      target: { type: "task", id: second.meetings.id },
      choices: [
        {
          key: `task:${second.meetings.id}`,
          kind: "link",
          id: T_MEETINGS,
          overwrite: "to-pm4"
        }
      ]
    });
    expect(toPm4.status).toBe(200);
    expect(byKey(toPm4.body.items)[`task:${second.meetings.id}`]).toMatchObject(
      {
        outcome: "updated",
        reason: "PM4 overwritten with PMSPA's version",
        newTitle: "Meetings & demos"
      }
    );
    expect(await findTask(second.meetings.id)).toMatchObject({
      title: "Meetings & demos",
      description: "Client calls and demos.",
      status: "in-progress"
    });
    expect(fake.tasks.find((t) => t.id === T_MEETINGS)?.title).toBe(
      "Meetings & demos"
    );
  });

  it("AC-12 API-INT-015 FR-INT-008: after an overwrite the pair is up to date; a PM4 edit then suggests to-pmspa", async () => {
    const { a, meetings } = await setup();
    await as(a).post("/sync", {
      target: { type: "task", id: meetings.id },
      choices: [
        {
          key: `task:${meetings.id}`,
          kind: "link",
          id: T_MEETINGS,
          overwrite: "to-pmspa"
        }
      ]
    });

    const synced = await as(a).post<{ items: PreviewItem[] }>("/sync/preview", {
      type: "task",
      id: meetings.id
    });
    expect(synced.status).toBe(200);
    expect(synced.body.items[1]).toMatchObject({
      key: `task:${meetings.id}`,
      action: "skip"
    });

    await testDb().query("UPDATE tasks SET title = $2 WHERE id = $1", [
      meetings.id,
      "Weekly meetings"
    ]);
    const edited = await as(a).post<{ items: PreviewItem[] }>("/sync/preview", {
      type: "task",
      id: meetings.id
    });
    expect(edited.body.items[1]).toMatchObject({
      action: "differs",
      direction: "to-pmspa",
      reason: "Changed in PM4 since the last sync",
      differences: [
        { field: "Title", pm4: "Weekly meetings", pmspa: "Meetings" }
      ]
    });
  });

  it("AC-13 API-INT-015 API-INT-016 FR-INT-008: an unlinked PM4 project → create with PMSPA candidates, the closest title first; linking one changes neither side", async () => {
    const { a, internal } = await setup();
    const P_LOWER = "66f1a0c0e4b0000000000007";
    fake.projects.push({
      id: P_LOWER,
      owner: X,
      title: "pm internal",
      done: false
    });

    const preview = await as(a).post<{ items: PreviewItem[] }>(
      "/sync/preview",
      { type: "project", id: internal.id }
    );
    expect(preview.status).toBe(200);
    expect(preview.body.items).toHaveLength(1);
    expect(preview.body.items[0]).toMatchObject({
      key: `project:${internal.id}`,
      action: "create",
      direction: "to-pmspa",
      linkedId: null
    });
    expect(preview.body.items[0].candidates.map((c) => c.id)).toEqual([
      P_LOWER,
      P_ACME,
      P_ARCHIVE,
      P_NVIDIA
    ]);

    const run = await as(a).post<{ items: ResultItem[] }>("/sync", {
      target: { type: "project", id: internal.id },
      choices: [
        {
          key: `project:${internal.id}`,
          kind: "link",
          id: P_ACME,
          overwrite: null
        }
      ]
    });
    expect(run.status).toBe(200);
    expect(run.body.items[0]).toMatchObject({
      outcome: "linked",
      reason: null
    });
    expect((await findProjectRow(internal.id))?.title).toBe("PM Internal");
    expect(fake.projects.find((p) => p.id === P_ACME)?.title).toBe(
      "Acme Website Relaunch"
    );
    expect(pmspaWrites()).toEqual([]);
    expect(await findLink("project", internal.id)).toMatchObject({
      pmspa_id: P_ACME,
      origin: "linked"
    });
  });

  it("AC-14 API-INT-016 FR-INT-012: syncing a new project creates it and the tasks not left out in PMSPA, linked as pushed", async () => {
    const { a } = await setup();
    const rivian = await insertProject(a.id, { title: "Rivian" });
    const kickoff = await insertTaskRow(a.id, rivian.id, {
      title: "Kickoff",
      status: "completed"
    });
    const backlog = await insertTaskRow(a.id, rivian.id, { title: "Backlog" });

    const run = await as(a).post<{ items: ResultItem[] }>("/sync", {
      target: { type: "project", id: rivian.id },
      choices: [{ key: `task:${backlog.id}`, kind: "skip" }]
    });

    expect(run.status).toBe(200);
    const items = byKey(run.body.items);
    expect(items[`project:${rivian.id}`].outcome).toBe("created");
    expect(items[`task:${kickoff.id}`].outcome).toBe("created");
    expect(items[`task:${backlog.id}`].outcome).toBe("skipped");

    const created = fake.projects.find((p) => p.title === "Rivian");
    expect(created?.owner).toBe(X);
    const task = fake.tasks.find((t) => t.title === "Kickoff");
    expect(task).toMatchObject({
      project: created?.id,
      column: "Completed",
      done: true
    });
    expect(fake.tasks.some((t) => t.title === "Backlog")).toBe(false);
    expect(await findLink("project", rivian.id)).toMatchObject({
      pmspa_id: created?.id,
      origin: "pushed"
    });
    expect(await findLink("task", kickoff.id)).toMatchObject({
      pmspa_id: task?.id,
      origin: "pushed"
    });
    expect(await findLink("task", backlog.id)).toBeNull();
  });

  it("AC-15 API-INT-015 API-INT-016 FR-INT-008: a field PM4 has empty can't be cleared in PMSPA: the row warns and PMSPA keeps it", async () => {
    const { a, tesla } = await setup();

    const preview = await as(a).post<{ items: PreviewItem[] }>(
      "/sync/preview",
      { type: "project", id: tesla.id }
    );
    expect(preview.status).toBe(200);
    expect(preview.body.items[0].warnings).toContain(
      "PMSPA can't clear the Description: it keeps its value."
    );

    const run = await as(a).post<{ items: ResultItem[] }>("/sync", {
      target: { type: "project", id: tesla.id },
      choices: [
        {
          key: `project:${tesla.id}`,
          kind: "link",
          id: P_TESLA,
          overwrite: "to-pmspa"
        }
      ]
    });
    expect(run.status).toBe(200);
    expect(run.body.items[0].outcome).toBe("updated");
    expect(fake.projects.find((p) => p.id === P_TESLA)?.description).toBe(
      "QA retainer."
    );
  });

  it("AC-16 API-INT-009 API-INT-016 FR-INT-008: due dates go to PMSPA as 12:00 UTC and come back as the date in the user's zone", async () => {
    const { a, anthropic } = await setup();
    const deploy = await insertTaskRow(a.id, anthropic.id, {
      title: "Deploy",
      dueDate: "2026-10-20"
    });

    const pushed = await as(a).post<{ items: ResultItem[] }>("/sync", {
      target: { type: "task", id: deploy.id },
      choices: []
    });
    expect(pushed.status).toBe(200);
    expect(byKey(pushed.body.items)[`task:${deploy.id}`].outcome).toBe(
      "created"
    );
    expect(fake.tasks.find((t) => t.title === "Deploy")).toMatchObject({
      project: P_ANTHROPIC,
      dueDate: Date.UTC(2026, 9, 20, 12)
    });

    fake.tasks.find((t) => t.id === T_NVIDIA_DEV)!.dueDate = Date.UTC(
      2026,
      9,
      19,
      22
    );
    const imported = await as(a).post<{ items: ResultItem[] }>("/import", {
      selection: { projects: [{ id: P_NVIDIA, taskIds: [T_NVIDIA_DEV] }] },
      choices: []
    });
    expect(imported.status).toBe(200);
    const [nvidia] = await projectsTitled(a.id, "Nvidia");
    const tasks = await tasksOf(nvidia.id);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      title: "Development",
      due_date: "2026-10-20"
    });
  });

  it("AC-17 API-INT-016 FR-INT-012: a write PMSPA rejects fails that row with PMSPA's reason; the other rows are still written", async () => {
    const { a } = await setup();
    const rivian = await insertProject(a.id, { title: "Rivian" });
    await insertTaskRow(a.id, rivian.id, { title: "Kickoff" });
    await insertTaskRow(a.id, rivian.id, { title: "Backlog" });
    const message = '"title" is not allowed to be empty';
    fake.rejections = [
      {
        method: "POST",
        path: "/v1/tasks",
        status: 500,
        body: { error: "ERR_VALIDATION", message }
      }
    ];

    const run = await as(a).post<{ items: ResultItem[] }>("/sync", {
      target: { type: "project", id: rivian.id },
      choices: []
    });

    expect(run.status).toBe(200);
    const items = byKey(run.body.items);
    expect(items[`project:${rivian.id}`].outcome).toBe("created");
    const taskItems = run.body.items.filter((i) => i.type === "task");
    expect(taskItems.map((i) => i.outcome).sort()).toEqual([
      "created",
      "failed"
    ]);
    expect(taskItems.find((i) => i.outcome === "failed")?.reason).toBe(
      `PMSPA rejected it: ${message} (ERR_VALIDATION)`
    );
    const created = fake.projects.find((p) => p.title === "Rivian");
    expect(fake.tasks.filter((t) => t.project === created?.id)).toHaveLength(1);
  });

  it("AC-18 API-INT-016 FR-INT-012: two syncs at once → one answers 409 pmspa-sync-running; another user's project or a random id → 404", async () => {
    const { a, internal } = await setup();
    fake.latencyMs = 100;
    const body = { target: { type: "project", id: internal.id }, choices: [] };

    const [first, second] = await Promise.all([
      as(a).post<Problem>("/sync", body),
      wait(20).then(() => as(a).post<Problem>("/sync", body))
    ]);

    expect([first.status, second.status].sort()).toEqual([200, 409]);
    const busy = first.status === 409 ? first : second;
    expect(busy.body.type).toBe(errorType("pmspa-sync-running"));
    expect(fake.projects.filter((p) => p.title === "PM Internal")).toHaveLength(
      1
    );

    fake.latencyMs = 0;
    const b = await newUser();
    const theirs = await insertProject(b.id, { title: "Theirs" });
    const foreign = await as(a).post("/sync", {
      target: { type: "project", id: theirs.id },
      choices: []
    });
    expect(foreign.status).toBe(404);
    const missing = await as(a).post("/sync", {
      target: { type: "task", id: randomUUID() },
      choices: []
    });
    expect(missing.status).toBe(404);
  });

  it("AC-19 API-INT-008 API-INT-016: invalid selections, choices and targets → 400", async () => {
    const { a, internal } = await setup();
    const hexId = (i: number) => i.toString(16).padStart(24, "0");
    const target = { type: "project", id: internal.id };

    const cases: [string, object][] = [
      ["/import/preview", { projects: [{ id: "xyz", taskIds: null }] }],
      [
        "/import/preview",
        {
          projects: Array.from({ length: 51 }, (_, i) => ({
            id: hexId(i),
            taskIds: null
          }))
        }
      ],
      [
        "/sync",
        {
          target,
          choices: Array.from({ length: 501 }, (_, i) => ({
            key: `task:${i}`,
            kind: "skip"
          }))
        }
      ],
      ["/sync", { target, choices: [{ key: "project:x", kind: "x" }] }],
      ["/sync", { target: { type: "day", id: internal.id }, choices: [] }]
    ];
    for (const [path, body] of cases) {
      const res = await as(a).post(path, body);
      expect(res.status, `${path} ${JSON.stringify(body).slice(0, 80)}`).toBe(
        400
      );
    }
    expect(pmspaWrites()).toEqual([]);
  });
});
