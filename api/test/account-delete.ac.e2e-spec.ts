import { randomBytes } from "node:crypto";
import { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import type { GoogleProfile } from "../src/auth/google-oidc.js";
import { FakeGoogleOidc } from "./fake-google-oidc.js";
import {
  accessTokenFor,
  closeTestClients,
  createAuthTestApp,
  deleteTestUsers,
  findUserByEmail,
  findUserById,
  googleProfile,
  insertUser,
  testDb,
  testRedis,
  type UserRow
} from "./support/auth-test-utils.js";
import {
  findProjectRow,
  insertProject,
  insertService,
  insertTask
} from "./support/project-test-utils.js";

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** The fields these tests read from a JSON body. */
interface Json {
  type?: string;
  id?: string;
  projectLead?: unknown;
  items?: unknown[];
  total?: number;
}

const json = (response: { body: unknown }): Json => response.body as Json;

const errorType = (slug: string) => `${process.env.WEB_APP_URL}/errors/${slug}`;

/** An `updated_at` well in the past, so a write that touches it shows. */
const OLD = new Date("2026-01-02T03:04:05.000Z");

/** Every table with a `user_id` column that the account owns (AC-3). */
const OWNED_TABLES = [
  "user_identities",
  "projects",
  "tasks",
  "project_services",
  "workdays",
  "time_logs",
  "bookings",
  "notes",
  "todos",
  "pmspa_connections",
  "pmspa_project_links",
  "pmspa_task_links",
  "pmspa_log_links"
] as const;

const objectIdBytes = () => randomBytes(12);
const hashBytes = () => randomBytes(32);

describe("DELETE /api/v1/me account deletion (feat-acct-api)", () => {
  const fake = new FakeGoogleOidc();
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createAuthTestApp(fake);
  });

  afterAll(async () => {
    await deleteTestUsers();
    await closeTestClients();
    await app?.close();
  });

  // ---------- helpers ----------

  /** The whole sign-in (API-AUTH-001/002/003): Google → login code → token pair. */
  async function signIn(profile: GoogleProfile): Promise<TokenPair> {
    const start = await request(app.getHttpServer()).get("/api/v1/auth/google");
    expect(start.status, "GET /auth/google").toBe(302);
    fake.nextResult = profile;
    const callback = await request(app.getHttpServer()).get(
      `/api/v1/auth/google/callback?code=google-code&state=${encodeURIComponent(fake.lastState)}`
    );
    expect(callback.status, "callback").toBe(302);
    const code = new URL(callback.headers.location).searchParams.get("code");
    expect(code, "login code").toBeTruthy();
    const token = await request(app.getHttpServer())
      .post("/api/v1/auth/token")
      .send({ code });
    expect(token.status, "POST /auth/token").toBe(200);
    return token.body as TokenPair;
  }

  const deleteMe = (accessToken?: string) => {
    const req = request(app.getHttpServer()).delete("/api/v1/me");
    return accessToken === undefined
      ? req
      : req.set("Authorization", `Bearer ${accessToken}`);
  };

  const getAs = (accessToken: string, path: string) =>
    request(app.getHttpServer())
      .get(`/api/v1${path}`)
      .set("Authorization", `Bearer ${accessToken}`);

  const refresh = (refreshToken: string) =>
    request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .send({ refreshToken });

  /** Rows of `userId` in each owned table, plus the `users` row itself. */
  async function rowCounts(userId: string): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    const users = await testDb().query<{ n: string }>(
      "SELECT count(*) AS n FROM users WHERE id = $1",
      [userId]
    );
    counts.users = Number(users.rows[0].n);
    for (const table of OWNED_TABLES) {
      const result = await testDb().query<{ n: string }>(
        `SELECT count(*) AS n FROM ${table} WHERE user_id = $1`,
        [userId]
      );
      counts[table] = Number(result.rows[0].n);
    }
    return counts;
  }

  /** One row of `user`'s in every owned table (the identity comes from sign-in). */
  async function seedEverything(userId: string): Promise<void> {
    const db = testDb();
    const project = await insertProject(userId, { title: "A's project" });
    const service = await insertService(userId, project.id, "Design");
    const task = await insertTask(userId, project.id, { title: "A's task" });
    await db.query("UPDATE tasks SET service_id = $2 WHERE id = $1", [
      task.id,
      service.id
    ]);
    await db.query(
      "INSERT INTO workdays (user_id, work_date, start_minute) VALUES ($1, '2026-11-02', 480)",
      [userId]
    );
    const log = await db.query<{ id: string }>(
      `INSERT INTO time_logs (user_id, work_date, duration_minutes, text, project_id, task_id)
       VALUES ($1, '2026-11-02', 60, 'Worked', $2, $3) RETURNING id`,
      [userId, project.id, task.id]
    );
    const logId = log.rows[0].id;
    await db.query(
      "INSERT INTO bookings (user_id, time_log_id, booking_date, minutes) VALUES ($1, $2, '2026-11-02', 60)",
      [userId, logId]
    );
    await db.query(
      "INSERT INTO notes (user_id, body, project_id) VALUES ($1, 'A note', $2)",
      [userId, project.id]
    );
    await db.query(
      "INSERT INTO todos (user_id, text, task_id) VALUES ($1, 'A todo', $2)",
      [userId, task.id]
    );
    const pmspaUser = objectIdBytes();
    await db.query(
      `INSERT INTO pmspa_connections (user_id, last_checked_at, status, pmspa_user_id, url, email, password_enc)
       VALUES ($1, now(), 'connected', $2, 'https://pmspa.test', 'a@pmspa.test', $3)`,
      [userId, pmspaUser, randomBytes(40)]
    );
    for (const [table, column, id] of [
      ["pmspa_project_links", "project_id", project.id],
      ["pmspa_task_links", "task_id", task.id],
      ["pmspa_log_links", "time_log_id", logId]
    ] as const) {
      await db.query(
        `INSERT INTO ${table} (${column}, user_id, synced_at, origin, pmspa_user_id, pmspa_id, pm4_hash, pmspa_hash)
         VALUES ($1, $2, now(), 'imported', $3, $4, $5, $6)`,
        [id, userId, pmspaUser, objectIdBytes(), hashBytes(), hashBytes()]
      );
    }
  }

  /** A task of `owner`'s whose lead is `lead` (a user lead: id and saved name). */
  async function insertTaskLedBy(
    owner: UserRow,
    projectId: string,
    lead: UserRow
  ): Promise<string> {
    const task = await insertTask(owner.id, projectId, { title: "B's task" });
    await testDb().query(
      `UPDATE tasks SET project_lead_user_id = $2, project_lead = $3, updated_at = $4
       WHERE id = $1`,
      [task.id, lead.id, lead.display_name, OLD]
    );
    return task.id;
  }

  async function taskLeadRow(id: string) {
    const result = await testDb().query<{
      project_lead: string | null;
      project_lead_user_id: string | null;
      updated_at: Date;
    }>(
      "SELECT project_lead, project_lead_user_id, updated_at FROM tasks WHERE id = $1",
      [id]
    );
    return result.rows[0];
  }

  // ---------- API-USR-004 ----------

  it("AC-3 API-USR-004: DELETE /me → 204, empty body; every row of the user is gone", async () => {
    const profile = googleProfile({ name: "Ada Deleted" });
    const tokens = await signIn(profile);
    const user = (await findUserByEmail(profile.email))!;
    await seedEverything(user.id);
    const before = await rowCounts(user.id);
    for (const [table, n] of Object.entries(before)) {
      expect(n, `seeded ${table}`).toBeGreaterThan(0);
    }

    const response = await deleteMe(tokens.accessToken);

    expect(response.status).toBe(204);
    expect(response.text).toBe("");
    const after = await rowCounts(user.id);
    for (const [table, n] of Object.entries(after)) {
      expect(n, `rows left in ${table}`).toBe(0);
    }
  });

  it("AC-4 FR-AUTH-008: other users' items led by the user lose the lead (id and saved name), updated_at unchanged; text leads stay", async () => {
    const a = await insertUser({ display_name: "Lead Ana" });
    const b = await insertUser({ display_name: "Owner Bea" });
    const ledProject = await insertProject(b.id, {
      title: "B's led project",
      project_lead_user_id: a.id,
      project_lead: a.display_name,
      updated_at: OLD
    });
    const ledTaskId = await insertTaskLedBy(b, ledProject.id, a);
    const textProject = await insertProject(b.id, {
      title: "B's text-lead project",
      project_lead: a.display_name,
      updated_at: OLD
    });
    const bToken = accessTokenFor(b.id);

    const response = await deleteMe(accessTokenFor(a.id));
    expect(response.status).toBe(204);

    const project = await getAs(bToken, `/projects/${ledProject.id}`);
    expect(project.status).toBe(200);
    expect(json(project).projectLead).toBeNull();
    const task = await getAs(bToken, `/tasks/${ledTaskId}`);
    expect(task.status).toBe(200);
    expect(json(task).projectLead).toBeNull();

    const projectRow = (await findProjectRow(ledProject.id))!;
    expect(projectRow.project_lead).toBeNull();
    expect(projectRow.project_lead_user_id).toBeNull();
    expect(projectRow.updated_at.toISOString()).toBe(OLD.toISOString());
    const taskRow = await taskLeadRow(ledTaskId);
    expect(taskRow.project_lead).toBeNull();
    expect(taskRow.project_lead_user_id).toBeNull();
    expect(taskRow.updated_at.toISOString()).toBe(OLD.toISOString());

    const textRow = (await findProjectRow(textProject.id))!;
    expect(textRow.project_lead).toBe("Lead Ana");
    expect(textRow.project_lead_user_id).toBeNull();
    expect(textRow.updated_at.toISOString()).toBe(OLD.toISOString());
    const text = await getAs(bToken, `/projects/${textProject.id}`);
    expect(text.status).toBe(200);
    expect(json(text).projectLead).toEqual({
      kind: "text",
      name: "Lead Ana",
      user: null
    });
  });

  it("AC-5 FR-AUTH-008: another user's own data is untouched and their session still works", async () => {
    const a = await insertUser({ display_name: "Ana" });
    await seedEverything(a.id);
    const bProfile = googleProfile({ name: "Bea Stays" });
    const bTokens = await signIn(bProfile);
    const b = (await findUserByEmail(bProfile.email))!;
    await seedEverything(b.id);
    const bBefore = await rowCounts(b.id);
    const bProjects = await getAs(bTokens.accessToken, "/projects");
    expect(bProjects.status).toBe(200);
    const bDay = await getAs(bTokens.accessToken, "/workdays/2026-11-02");
    expect(bDay.status).toBe(200);

    const response = await deleteMe(accessTokenFor(a.id));
    expect(response.status).toBe(204);

    expect(await rowCounts(b.id)).toEqual(bBefore);
    expect(await findUserById(b.id)).toEqual(b);
    const projectsAfter = await getAs(bTokens.accessToken, "/projects");
    expect(projectsAfter.status).toBe(200);
    expect(projectsAfter.body).toEqual(bProjects.body);
    const dayAfter = await getAs(bTokens.accessToken, "/workdays/2026-11-02");
    expect(dayAfter.status).toBe(200);
    expect(dayAfter.body).toEqual(bDay.body);
    const refreshed = await refresh(bTokens.refreshToken);
    expect(refreshed.status).toBe(200);
    const me = await getAs((refreshed.body as TokenPair).accessToken, "/me");
    expect(me.status).toBe(200);
    expect(json(me).id).toBe(b.id);
  });

  it("AC-6 FR-AUTH-008: afterwards every refresh token of the user → 401, and GET /me with the old access token → 401", async () => {
    const profile = googleProfile({ name: "Two Sessions" });
    const first = await signIn(profile);
    const second = await signIn(profile);

    const response = await deleteMe(first.accessToken);
    expect(response.status).toBe(204);

    for (const [name, tokens] of [
      ["first", first],
      ["second", second]
    ] as const) {
      const refreshed = await refresh(tokens.refreshToken);
      expect(refreshed.status, `${name} refresh`).toBe(401);
      expect(json(refreshed).type).toBe(errorType("unauthorized"));
      const me = await getAs(tokens.accessToken, "/me");
      expect(me.status, `${name} GET /me`).toBe(401);
      expect(json(me).type).toBe(errorType("unauthorized"));
    }
  });

  it("AC-7 FR-AUTH-008: the cached PMSPA token and account are removed from Redis", async () => {
    const a = await insertUser({ display_name: "Pmspa Ana" });
    const tokenKey = `pmspa:token:${a.id}`;
    const accountKey = `pmspa:account:${a.id}`;
    const owner = { url: "https://pmspa.test", email: "a@pmspa.test" };
    await testRedis().set(
      tokenKey,
      JSON.stringify({ ...owner, token: "pmspa-jwt" }),
      "EX",
      3600
    );
    await testRedis().set(
      accountKey,
      JSON.stringify({ ...owner, account: { email: owner.email } }),
      "EX",
      3600
    );

    const response = await deleteMe(accessTokenFor(a.id));
    expect(response.status).toBe(204);

    expect(await testRedis().exists(tokenKey, accountKey)).toBe(0);
  });

  it("AC-8 API-USR-004: without a token → 401; a second DELETE /me with the same unexpired access token → 401", async () => {
    const noToken = await deleteMe();
    expect(noToken.status).toBe(401);
    expect(json(noToken).type).toBe(errorType("unauthorized"));

    const a = await insertUser({ display_name: "Twice" });
    const token = accessTokenFor(a.id);
    const first = await deleteMe(token);
    expect(first.status).toBe(204);

    const second = await deleteMe(token);
    expect(second.status).toBe(401);
    expect(json(second).type).toBe(errorType("unauthorized"));
  });

  it("AC-9 FR-AUTH-008: signing in again with the same Google identity creates a new user with no projects", async () => {
    const profile = googleProfile({ name: "Comes Back" });
    const before = await signIn(profile);
    const oldUser = (await findUserByEmail(profile.email))!;
    await insertProject(oldUser.id, { title: "Old project" });

    const response = await deleteMe(before.accessToken);
    expect(response.status).toBe(204);

    const after = await signIn(profile);
    const me = await getAs(after.accessToken, "/me");
    expect(me.status).toBe(200);
    expect(json(me).id).not.toBe(oldUser.id);
    const newUser = (await findUserByEmail(profile.email))!;
    expect(newUser.id).toBe(json(me).id);
    expect(await findUserById(oldUser.id)).toBeNull();
    const projects = await getAs(after.accessToken, "/projects");
    expect(projects.status).toBe(200);
    expect(json(projects).items).toEqual([]);
    expect(json(projects).total).toBe(0);
  });
});
