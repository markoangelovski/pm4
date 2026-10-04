import { randomUUID } from "node:crypto";
import { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { createTestApp } from "./create-test-app.js";
import {
  accessTokenFor,
  closeTestClients,
  deleteTestUsers,
  insertUser,
  testDb,
  type UserRow
} from "./support/auth-test-utils.js";
import {
  findProjectRow,
  insertProject,
  insertTask,
  type ProjectDbRow,
  type TaskDbRow,
  type TaskStatusValue
} from "./support/project-test-utils.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const errorType = (slug: string) => `${process.env.WEB_APP_URL}/errors/${slug}`;

interface LeadBody {
  kind: "user" | "text";
  name: string;
  user: { id: string; displayName: string; avatarUrl: string | null } | null;
}

interface TaskBody {
  id: string;
  project: { id: string | null; title: string; deleted: boolean };
  title: string;
  description: string | null;
  externalLink: string | null;
  projectLead: LeadBody | null;
  status: TaskStatusValue;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Any response body these tests read: a task, a page of them, a project or a Problem. */
interface Body extends TaskBody {
  items: TaskBody[];
  total: number;
  page: number;
  pageSize: number;
  taskCounts: Record<string, number>;
  type: string;
  projectId?: string;
  projectInTrash?: boolean;
  errors?: { field: string; message: string }[];
}

interface Res {
  status: number;
  headers: Record<string, string>;
  body: Body;
}

async function send(req: request.Test): Promise<Res> {
  const response = await req;
  return {
    status: response.status,
    headers: response.headers,
    body: response.body as Body
  };
}

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);

/** `insertTask` plus a due date and timestamps (the shared helper has neither). */
async function insertTaskWith(
  userId: string,
  projectId: string,
  fields: {
    title?: string;
    status?: TaskStatusValue;
    due_date?: string | null;
    updated_at?: Date;
    deleted_at?: Date | null;
  } = {}
): Promise<TaskDbRow> {
  const at = fields.updated_at ?? new Date();
  const result = await testDb().query<TaskDbRow>(
    `INSERT INTO tasks (user_id, project_id, status, title, due_date, created_at, updated_at, deleted_at)
     VALUES ($1, $2, $3, $4, $5, $6, $6, $7) RETURNING *`,
    [
      userId,
      projectId,
      fields.status ?? "upcoming",
      fields.title ?? "Seeded task",
      fields.due_date ?? null,
      at,
      fields.deleted_at ?? null
    ]
  );
  return result.rows[0];
}

async function findTaskRow(id: string): Promise<TaskDbRow | null> {
  const result = await testDb().query<TaskDbRow>(
    "SELECT * FROM tasks WHERE id = $1",
    [id]
  );
  return result.rows[0] ?? null;
}

describe("Tasks API (feat-tsk-api)", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await deleteTestUsers();
    await closeTestClients();
    await app.close();
  });

  /** Supertest with `user`'s bearer token; resolves to a typed response. */
  const as = (user: UserRow) => {
    const server = app.getHttpServer();
    const auth = `Bearer ${accessTokenFor(user.id)}`;
    return {
      get: (url: string) =>
        send(request(server).get(`/api/v1${url}`).set("Authorization", auth)),
      post: (url: string, body?: object) =>
        send(
          request(server)
            .post(`/api/v1${url}`)
            .set("Authorization", auth)
            .send(body)
        ),
      patch: (url: string, body: object) =>
        send(
          request(server)
            .patch(`/api/v1${url}`)
            .set("Authorization", auth)
            .send(body)
        ),
      delete: (url: string) =>
        send(request(server).delete(`/api/v1${url}`).set("Authorization", auth))
    };
  };

  const fieldsOf = (body: { errors?: { field: string }[] }) =>
    (body.errors ?? []).map((e) => e.field);

  /** Titles of A's tasks for a `/tasks` query, in response order. */
  const titlesFor = async (user: UserRow, query: string) => {
    const response = await as(user).get(`/tasks${query}`);
    expect(response.status, query).toBe(200);
    return response.body.items.map((t) => t.title);
  };

  it("AC-1 API-TSK-001: POST with a project and a title → 201 with defaults and a trimmed title", async () => {
    const a = await insertUser();
    const p = await insertProject(a.id, { title: "Website" });

    const response = await as(a).post("/tasks", {
      projectId: p.id,
      title: " Fix "
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: response.body.id,
      project: { id: p.id, title: "Website", deleted: false },
      title: "Fix",
      description: null,
      externalLink: null,
      projectLead: null,
      status: "upcoming",
      dueDate: null,
      createdAt: response.body.createdAt,
      updatedAt: response.body.updatedAt
    });
    expect(response.body.id).toMatch(UUID_RE);
    expect(response.body.createdAt).toMatch(ISO_RE);
    expect(response.body.updatedAt).toMatch(ISO_RE);
  });

  it("AC-2 API-TSK-001: POST with every field and a user lead → the same values, no email anywhere", async () => {
    const a = await insertUser();
    const b = await insertUser({
      display_name: "Barbara Liskov",
      avatar_url: "https://lh3.googleusercontent.com/a/barbara"
    });
    const p = await insertProject(a.id, { title: "Compiler" });

    const response = await as(a).post("/tasks", {
      projectId: p.id,
      title: "Parser",
      description: "Line one\nLine two",
      externalLink: "https://example.com/parser",
      projectLeadUserId: b.id,
      status: "in-progress",
      dueDate: "2026-10-04"
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      project: { id: p.id, title: "Compiler", deleted: false },
      title: "Parser",
      description: "Line one\nLine two",
      externalLink: "https://example.com/parser",
      status: "in-progress",
      dueDate: "2026-10-04",
      projectLead: {
        kind: "user",
        name: "Barbara Liskov",
        user: {
          id: b.id,
          displayName: "Barbara Liskov",
          avatarUrl: "https://lh3.googleusercontent.com/a/barbara"
        }
      }
    });
    expect(Object.keys(response.body.projectLead?.user ?? {}).sort()).toEqual([
      "avatarUrl",
      "displayName",
      "id"
    ]);
    expect(JSON.stringify(response.body)).not.toContain("email");
    expect(JSON.stringify(response.body)).not.toContain(b.email);
  });

  describe("AC-3 API-TSK-001: invalid bodies → 400 validation with the field", () => {
    let a: UserRow;
    let projectId: string;
    let leadUserId: string;

    const cases: [string, () => object, string][] = [
      ["no projectId", () => ({ title: "T" }), "projectId"],
      [
        "a projectId that isn't a UUID",
        () => ({ projectId: "x", title: "T" }),
        "projectId"
      ],
      ["no title", () => ({ projectId }), "title"],
      ["a blank title", () => ({ projectId, title: "   " }), "title"],
      [
        "a 201-char title",
        () => ({ projectId, title: "x".repeat(201) }),
        "title"
      ],
      [
        "an unknown status",
        () => ({ projectId, title: "T", status: "done" }),
        "status"
      ],
      [
        "a null status",
        () => ({ projectId, title: "T", status: null }),
        "status"
      ],
      [
        "dueDate 2026-02-30",
        () => ({ projectId, title: "T", dueDate: "2026-02-30" }),
        "dueDate"
      ],
      [
        "dueDate 03.10.2026",
        () => ({ projectId, title: "T", dueDate: "03.10.2026" }),
        "dueDate"
      ],
      [
        "a dueDate with a time",
        () => ({ projectId, title: "T", dueDate: "2026-10-03T00:00:00Z" }),
        "dueDate"
      ],
      [
        "an invalid externalLink",
        () => ({ projectId, title: "T", externalLink: "ftp://x" }),
        "externalLink"
      ],
      [
        "both lead fields",
        () => ({
          projectId,
          title: "T",
          projectLeadUserId: leadUserId,
          projectLeadName: "Ana"
        }),
        "projectLeadName"
      ]
    ];

    beforeAll(async () => {
      a = await insertUser();
      projectId = (await insertProject(a.id)).id;
      leadUserId = (await insertUser()).id;
    });

    it.each(cases)("AC-3 API-TSK-001: %s → 400", async (_, body, field) => {
      const response = await as(a).post("/tasks", body());

      expect(response.status).toBe(400);
      expect(response.body.type).toBe(errorType("validation"));
      expect(fieldsOf(response.body)).toContain(field);
    });
  });

  it("AC-4 API-TSK-001: a project that is another user's, unknown or in the trash → 404 not-found, nothing created", async () => {
    const a = await insertUser();
    const b = await insertUser();
    const bs = await insertProject(b.id);
    const trashed = await insertProject(a.id, { deleted_at: new Date() });
    const own = await insertProject(a.id);

    // Control: the endpoint exists and creates in A's own active project.
    const control = await as(a).post("/tasks", {
      projectId: own.id,
      title: "Control"
    });
    expect(control.status).toBe(201);

    for (const projectId of [bs.id, randomUUID(), trashed.id]) {
      const response = await as(a).post("/tasks", { projectId, title: "T" });
      expect(response.status, projectId).toBe(404);
      expect(response.body.type).toBe(errorType("not-found"));
    }

    const count = await testDb().query<{ n: string }>(
      "SELECT count(*) AS n FROM tasks WHERE user_id = $1",
      [a.id]
    );
    expect(Number(count.rows[0].n)).toBe(1);
  });

  it("AC-5 API-TSK-002: projectId lists only that project's active tasks; foreign or trashed → empty; malformed → 400", async () => {
    const a = await insertUser();
    const b = await insertUser();
    const p = await insertProject(a.id, { title: "P" });
    const q = await insertProject(a.id, { title: "Q" });
    const trashed = await insertProject(a.id, { deleted_at: new Date() });
    const bs = await insertProject(b.id);
    await insertTask(a.id, p.id, { title: "P one" });
    await insertTask(a.id, p.id, { title: "P two" });
    await insertTask(a.id, p.id, {
      title: "P deleted",
      deleted_at: new Date()
    });
    await insertTask(a.id, q.id, { title: "Q one" });
    await insertTask(a.id, trashed.id, { title: "In trashed project" });
    await insertTask(b.id, bs.id, { title: "B's task" });

    const own = await as(a).get(`/tasks?projectId=${p.id}`);
    expect(own.status).toBe(200);
    expect(own.body.total).toBe(2);
    expect(own.body.items.map((t) => t.title).sort()).toEqual([
      "P one",
      "P two"
    ]);
    expect(own.body.items.every((t) => t.project.id === p.id)).toBe(true);

    for (const projectId of [bs.id, trashed.id]) {
      const response = await as(a).get(`/tasks?projectId=${projectId}`);
      expect(response.status, projectId).toBe(200);
      expect(response.body).toMatchObject({ items: [], total: 0 });
    }

    const malformed = await as(a).get("/tasks?projectId=x");
    expect(malformed.status).toBe(400);
    expect(fieldsOf(malformed.body)).toContain("projectId");
  });

  it("AC-6 API-TSK-002: without projectId → A's tasks across projects, none from a trashed project", async () => {
    const a = await insertUser();
    const b = await insertUser();
    const p = await insertProject(a.id, { title: "P" });
    const q = await insertProject(a.id, { title: "Q" });
    const trashed = await insertProject(a.id, { deleted_at: new Date() });
    await insertTask(a.id, p.id, { title: "In P" });
    await insertTask(a.id, q.id, { title: "In Q" });
    await insertTask(a.id, trashed.id, { title: "In trashed project" });
    await insertTask(b.id, (await insertProject(b.id)).id, { title: "B's" });

    const response = await as(a).get("/tasks");

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(2);
    expect(response.body.items.map((t) => t.title).sort()).toEqual([
      "In P",
      "In Q"
    ]);
  });

  it("AC-7 API-TSK-002: the status filter takes a comma-separated subset; empty or unknown → 400", async () => {
    const a = await insertUser();
    const p = await insertProject(a.id);
    await insertTask(a.id, p.id, { title: "Up", status: "upcoming" });
    await insertTask(a.id, p.id, { title: "Doing", status: "in-progress" });
    await insertTask(a.id, p.id, { title: "Done", status: "completed" });
    const sorted = async (query: string) => (await titlesFor(a, query)).sort();

    expect(await sorted("?status=upcoming,in-progress")).toEqual([
      "Doing",
      "Up"
    ]);
    expect(await sorted("?status=completed")).toEqual(["Done"]);
    expect(await sorted("?status=upcoming,upcoming")).toEqual(["Up"]);
    expect(await sorted("")).toEqual(["Doing", "Done", "Up"]);

    for (const query of ["status=", "status=done"]) {
      const response = await as(a).get(`/tasks?${query}`);
      expect(response.status, query).toBe(400);
      expect(response.body.type).toBe(errorType("validation"));
      expect(fieldsOf(response.body)).toContain("status");
    }
  });

  it("AC-8 API-TSK-002: q matches the title case-insensitively, with LIKE wildcards escaped", async () => {
    const a = await insertUser();
    const p = await insertProject(a.id);
    for (const title of ["API docs", "rapid", "Docs", "50% off", "500"]) {
      await insertTask(a.id, p.id, { title });
    }
    const sorted = async (q: string) =>
      (await titlesFor(a, `?q=${encodeURIComponent(q)}`)).sort();

    expect(await sorted("api")).toEqual(["API docs", "rapid"]);
    expect(await sorted("50%")).toEqual(["50% off"]);
  });

  it("AC-9 API-TSK-002: sorting by due date (no date last), title and updatedAt (default); unknown sort → 400; pagination", async () => {
    const a = await insertUser();
    const p = await insertProject(a.id);
    await insertTaskWith(a.id, p.id, {
      title: "charlie",
      due_date: "2026-10-05",
      updated_at: daysAgo(3)
    });
    await insertTaskWith(a.id, p.id, {
      title: "Alpha",
      due_date: null,
      updated_at: daysAgo(1)
    });
    await insertTaskWith(a.id, p.id, {
      title: "bravo",
      due_date: "2026-10-01",
      updated_at: daysAgo(2)
    });

    expect(await titlesFor(a, "?sort=dueDate:asc")).toEqual([
      "bravo",
      "charlie",
      "Alpha"
    ]);
    expect(await titlesFor(a, "?sort=dueDate:desc")).toEqual([
      "charlie",
      "bravo",
      "Alpha"
    ]);
    expect(await titlesFor(a, "?sort=title:asc")).toEqual([
      "Alpha",
      "bravo",
      "charlie"
    ]);
    expect(await titlesFor(a, "")).toEqual(["Alpha", "bravo", "charlie"]);
    expect(await titlesFor(a, "?sort=updatedAt:asc")).toEqual([
      "charlie",
      "bravo",
      "Alpha"
    ]);

    const unknown = await as(a).get("/tasks?sort=status:asc");
    expect(unknown.status).toBe(400);
    expect(fieldsOf(unknown.body)).toContain("sort");

    const second = await as(a).get("/tasks?pageSize=2&page=2");
    expect(second.status).toBe(200);
    expect(second.body).toMatchObject({ total: 3, page: 2, pageSize: 2 });
    expect(second.body.items).toHaveLength(1);

    const beyond = await as(a).get("/tasks?page=5");
    expect(beyond.status).toBe(200);
    expect(beyond.body).toMatchObject({ items: [], total: 3 });

    for (const query of ["page=0", "pageSize=0", "pageSize=101"]) {
      const response = await as(a).get(`/tasks?${query}`);
      expect(response.status, query).toBe(400);
      expect(response.body.type).toBe(errorType("validation"));
    }
  });

  it("AC-10 API-TSK-003: GET one: own → 200; foreign, unknown or malformed → not-found; deleted or in a trashed project → in-trash", async () => {
    const a = await insertUser();
    const b = await insertUser();
    const p = await insertProject(a.id, { title: "P" });
    const created = await as(a).post("/tasks", {
      projectId: p.id,
      title: "Mine"
    });
    const bs = await insertTask(b.id, (await insertProject(b.id)).id);
    const deleted = await insertTask(a.id, p.id, { deleted_at: new Date() });
    const trashedProject = await insertProject(a.id, {
      deleted_at: new Date()
    });
    const inTrashedProject = await insertTask(a.id, trashedProject.id);

    const own = await as(a).get(`/tasks/${created.body.id}`);
    expect(own.status).toBe(200);
    expect(own.body).toEqual(created.body);

    for (const id of [bs.id, randomUUID(), "abc"]) {
      const response = await as(a).get(`/tasks/${id}`);
      expect(response.status, id).toBe(404);
      expect(response.body.type).toBe(errorType("not-found"));
    }

    const individually = await as(a).get(`/tasks/${deleted.id}`);
    expect(individually.status).toBe(404);
    expect(individually.headers["content-type"]).toContain(
      "application/problem+json"
    );
    expect(individually.body).toMatchObject({
      type: errorType("in-trash"),
      projectId: p.id,
      projectInTrash: false
    });

    const viaProject = await as(a).get(`/tasks/${inTrashedProject.id}`);
    expect(viaProject.status).toBe(404);
    expect(viaProject.body).toMatchObject({
      type: errorType("in-trash"),
      projectId: trashedProject.id,
      projectInTrash: true
    });
  });

  it("AC-11 API-TSK-004: PATCH status → 200, updatedAt later, the project's updatedAt unchanged, counts follow", async () => {
    const a = await insertUser();
    const p = await insertProject(a.id, { updated_at: daysAgo(2) });
    const task = await insertTaskWith(a.id, p.id, {
      status: "upcoming",
      updated_at: daysAgo(1)
    });

    const response = await as(a).patch(`/tasks/${task.id}`, {
      status: "completed"
    });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("completed");
    expect(Date.parse(response.body.updatedAt)).toBeGreaterThan(
      task.updated_at.getTime()
    );
    expect((await findProjectRow(p.id))!.updated_at.toISOString()).toBe(
      p.updated_at.toISOString()
    );

    const project = await as(a).get(`/projects/${p.id}`);
    expect(project.body.taskCounts).toEqual({
      upcoming: 0,
      inProgress: 0,
      completed: 1,
      total: 1
    });
  });

  it("AC-12 API-TSK-004: PATCH clears optional fields with null; null projectId, title or status → 400; {} → 200", async () => {
    const a = await insertUser();
    const p = await insertProject(a.id);
    const created = await as(a).post("/tasks", {
      projectId: p.id,
      title: "Full",
      description: "Desc",
      externalLink: "https://example.com/full",
      projectLeadName: "Ana",
      dueDate: "2026-10-04"
    });
    const url = `/tasks/${created.body.id}`;

    const cleared = await as(a).patch(url, {
      description: null,
      externalLink: null,
      dueDate: null,
      projectLeadName: null
    });
    expect(cleared.status).toBe(200);
    expect(cleared.body).toMatchObject({
      title: "Full",
      description: null,
      externalLink: null,
      dueDate: null,
      projectLead: null
    });

    for (const field of ["title", "status", "projectId"]) {
      const response = await as(a).patch(url, { [field]: null });
      expect(response.status, field).toBe(400);
      expect(response.body.type).toBe(errorType("validation"));
      expect(fieldsOf(response.body)).toContain(field);
    }

    const empty = await as(a).patch(url, {});
    expect(empty.status).toBe(200);
    expect(empty.body.title).toBe("Full");
  });

  it("AC-13 API-TSK-004: PATCH projectId moves the task; a foreign or trashed project → 404 not-found, task unchanged", async () => {
    const a = await insertUser();
    const b = await insertUser();
    const p = await insertProject(a.id, { title: "P" });
    const q = await insertProject(a.id, { title: "Q" });
    const task = await insertTask(a.id, p.id, { title: "Mover" });
    const url = `/tasks/${task.id}`;

    const moved = await as(a).patch(url, { projectId: q.id });
    expect(moved.status).toBe(200);
    expect(moved.body.project).toEqual({
      id: q.id,
      title: "Q",
      deleted: false
    });

    expect(await titlesFor(a, `?projectId=${p.id}`)).toEqual([]);
    expect(await titlesFor(a, `?projectId=${q.id}`)).toEqual(["Mover"]);
    expect((await as(a).get(`/projects/${p.id}`)).body.taskCounts.total).toBe(
      0
    );
    expect((await as(a).get(`/projects/${q.id}`)).body.taskCounts.total).toBe(
      1
    );

    const bs = await insertProject(b.id);
    const trashed = await insertProject(a.id, { deleted_at: new Date() });
    for (const projectId of [bs.id, trashed.id]) {
      const response = await as(a).patch(url, { projectId });
      expect(response.status, projectId).toBe(404);
      expect(response.body.type).toBe(errorType("not-found"));
    }
    expect((await findTaskRow(task.id))!.project_id).toBe(q.id);
  });

  it("AC-14 API-TSK-004/005: PATCH or DELETE a deleted task → in-trash; another user's → not-found", async () => {
    const a = await insertUser();
    const b = await insertUser();
    const p = await insertProject(a.id);
    const deleted = await insertTask(a.id, p.id, { deleted_at: new Date() });
    const bs = await insertTask(b.id, (await insertProject(b.id)).id);

    const patched = await as(a).patch(`/tasks/${deleted.id}`, { title: "X" });
    expect(patched.status).toBe(404);
    expect(patched.body.type).toBe(errorType("in-trash"));
    const again = await as(a).delete(`/tasks/${deleted.id}`);
    expect(again.status).toBe(404);
    expect(again.body.type).toBe(errorType("in-trash"));

    const foreignPatch = await as(a).patch(`/tasks/${bs.id}`, { title: "X" });
    expect(foreignPatch.status).toBe(404);
    expect(foreignPatch.body.type).toBe(errorType("not-found"));
    const foreignDelete = await as(a).delete(`/tasks/${bs.id}`);
    expect(foreignDelete.status).toBe(404);
    expect(foreignDelete.body.type).toBe(errorType("not-found"));
    expect((await findTaskRow(bs.id))!.deleted_at).toBeNull();
  });

  it("AC-15 API-TSK-005: DELETE → 204; the task is in the trash, out of lists and counts; the project's updatedAt unchanged", async () => {
    const a = await insertUser();
    const p: ProjectDbRow = await insertProject(a.id, {
      updated_at: daysAgo(2)
    });
    const task = await insertTask(a.id, p.id, { title: "To trash" });
    await insertTask(a.id, p.id, { title: "Stays" });
    const url = `/tasks/${task.id}`;

    const deleted = await as(a).delete(url);
    expect(deleted.status).toBe(204);

    const read = await as(a).get(url);
    expect(read.status).toBe(404);
    expect(read.body.type).toBe(errorType("in-trash"));
    expect(await titlesFor(a, "")).toEqual(["Stays"]);
    expect(await titlesFor(a, `?projectId=${p.id}`)).toEqual(["Stays"]);
    expect((await as(a).get(`/projects/${p.id}`)).body.taskCounts.total).toBe(
      1
    );
    expect((await findTaskRow(task.id))!.deleted_at).not.toBeNull();
    expect((await findProjectRow(p.id))!.updated_at.toISOString()).toBe(
      p.updated_at.toISOString()
    );
  });

  it("AC-16 API-TSK-006: restore brings a deleted task back; active → 204; in a trashed project → 409; foreign → not-found", async () => {
    const a = await insertUser();
    const b = await insertUser();
    const p = await insertProject(a.id);
    const deleted = await insertTask(a.id, p.id, { deleted_at: daysAgo(1) });
    const active = await insertTask(a.id, p.id);
    const trashedProject = await insertProject(a.id, {
      deleted_at: new Date()
    });
    const inTrashedProject = await insertTask(a.id, trashedProject.id, {
      deleted_at: daysAgo(1)
    });
    const bs = await insertTask(b.id, (await insertProject(b.id)).id, {
      deleted_at: daysAgo(1)
    });

    const restored = await as(a).post(`/tasks/${deleted.id}/restore`);
    expect(restored.status).toBe(204);
    expect((await as(a).get(`/tasks/${deleted.id}`)).status).toBe(200);

    const noop = await as(a).post(`/tasks/${active.id}/restore`);
    expect(noop.status).toBe(204);
    expect((await findTaskRow(active.id))!.deleted_at).toBeNull();

    const conflict = await as(a).post(`/tasks/${inTrashedProject.id}/restore`);
    expect(conflict.status).toBe(409);
    expect(conflict.body.type).toBe(errorType("conflict"));
    expect((await findTaskRow(inTrashedProject.id))!.deleted_at).not.toBeNull();

    const foreign = await as(a).post(`/tasks/${bs.id}/restore`);
    expect(foreign.status).toBe(404);
    expect(foreign.body.type).toBe(errorType("not-found"));
    expect((await findTaskRow(bs.id))!.deleted_at).not.toBeNull();
  });

  it("AC-17 API-TSK-001…006: every /tasks endpoint without a token → 401", async () => {
    const server = app.getHttpServer();
    const id = randomUUID();
    // Built one at a time: supertest closes its ephemeral server after a request.
    const calls = [
      () => request(server).get("/api/v1/tasks"),
      () =>
        request(server)
          .post("/api/v1/tasks")
          .send({ projectId: randomUUID(), title: "T" }),
      () => request(server).get(`/api/v1/tasks/${id}`),
      () => request(server).patch(`/api/v1/tasks/${id}`).send({ title: "T" }),
      () => request(server).delete(`/api/v1/tasks/${id}`),
      () => request(server).post(`/api/v1/tasks/${id}/restore`)
    ];

    for (const call of calls) {
      const response = await send(call());
      expect(response.status).toBe(401);
      expect(response.body.type).toBe(errorType("unauthorized"));
    }
  });
});
