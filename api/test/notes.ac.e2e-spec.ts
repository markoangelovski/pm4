import { randomUUID } from "node:crypto";
import { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { createTestApp } from "./create-test-app.js";
import {
  accessTokenFor,
  closeTestClients,
  deleteTestUsers,
  insertUser,
  type UserRow
} from "./support/auth-test-utils.js";
import { insertNote } from "./support/note-test-utils.js";
import {
  insertProject,
  insertTask,
  type ProjectDbRow,
  type TaskDbRow
} from "./support/project-test-utils.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

interface RefBody {
  id: string | null;
  title: string;
  deleted: boolean;
}

interface NoteBody {
  id: string;
  title: string | null;
  body: string;
  project: RefBody | null;
  task: RefBody | null;
  createdAt: string;
  updatedAt: string;
}

/** Any response body these tests read: a note, a page of notes or a Problem. */
interface Body extends NoteBody {
  items: NoteBody[];
  page: number;
  pageSize: number;
  total: number;
  detail?: string;
  errors?: { field: string; message: string }[];
}

interface Res {
  status: number;
  body: Body;
}

async function send(req: request.Test): Promise<Res> {
  const response = await req;
  return { status: response.status, body: response.body as Body };
}

describe("Notes API (feat-note-todos)", () => {
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

  /** User A (Zagreb) with project P (tasks T1, T2) and project Q; user B. */
  const seed = async () => {
    const a = await insertUser({ time_zone: "Europe/Zagreb" });
    const p = await insertProject(a.id, { title: "Website" });
    const t1 = await insertTask(a.id, p.id, { title: "Landing page" });
    const t2 = await insertTask(a.id, p.id, { title: "Pricing page" });
    const q = await insertProject(a.id, { title: "Mobile" });
    const b = await insertUser();
    return { a, p, t1, t2, q, b };
  };

  const ref = (row: ProjectDbRow | TaskDbRow) => ({
    id: row.id,
    title: row.title,
    deleted: false
  });

  /** The `Ref` of a deleted project or task: no id, its retained name. */
  const gone = (row: ProjectDbRow | TaskDbRow) => ({
    id: null,
    title: row.title,
    deleted: true
  });

  /** Creates a note for `user` over the API and returns it. */
  const createNote = async (
    user: UserRow,
    fields: Record<string, unknown> = {}
  ): Promise<NoteBody> => {
    const response = await as(user).post("/notes", { body: "Note", ...fields });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    return response.body;
  };

  /** `GET /notes{query}` → 200; the ids of the items, in order. */
  const ids = async (user: UserRow, query = "") => {
    const response = await as(user).get(`/notes${query}`);
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    return response.body.items.map((n) => n.id);
  };

  /** The note `id` as `GET /notes` returns it. */
  const read = async (user: UserRow, id: string) => {
    const response = await as(user).get("/notes?pageSize=100");
    expect(response.status).toBe(200);
    return response.body.items.find((n) => n.id === id);
  };

  /** Deletes a project (API-PRJ-005) or a task (API-TSK-005) of `user`. */
  const remove = async (
    user: UserRow,
    kind: "projects" | "tasks",
    id: string
  ) => {
    expect((await as(user).delete(`/${kind}/${id}`)).status).toBe(204);
  };

  it("AC-1 FR-NOTE-004: POST /notes → 201, blank title null, body trimmed, the task's project; without a token → 401", async () => {
    const { a, p, t1 } = await seed();

    const response = await as(a).post("/notes", {
      title: "  ",
      body: " # Hi ",
      taskId: t1.id
    });

    expect(response.status, JSON.stringify(response.body)).toBe(201);
    expect(response.body).toEqual({
      id: response.body.id,
      title: null,
      body: "# Hi",
      project: ref(p),
      task: ref(t1),
      createdAt: response.body.createdAt,
      updatedAt: response.body.createdAt
    });
    expect(response.body.id).toMatch(UUID_RE);
    expect(new Date(response.body.createdAt).toISOString()).toBe(
      response.body.createdAt
    );

    const anonymous = await request(app.getHttpServer())
      .post("/api/v1/notes")
      .send({ body: "x" });
    expect(anonymous.status).toBe(401);
  });

  describe("AC-2 FR-NOTE-004: invalid bodies and links", () => {
    it.each<[string, object, string]>([
      ["an empty body", { body: "" }, "body"],
      ["a blank body", { body: "  " }, "body"],
      ["no body", { title: "t" }, "body"],
      ["a 10001-char body", { body: "x".repeat(10001) }, "body"],
      ["a 201-char title", { body: "x", title: "x".repeat(201) }, "title"]
    ])(
      "AC-2 FR-NOTE-004: %s → 400 naming the field",
      async (_, body, field) => {
        const a = await insertUser();

        const response = await as(a).post("/notes", body);

        expect(response.status).toBe(400);
        expect(fieldsOf(response.body)).toContain(field);
        expect(await ids(a)).toEqual([]);
      }
    );

    it("AC-2 FR-NOTE-004: a task with a different projectId → 400 naming projectId", async () => {
      const { a, t1, q } = await seed();

      const response = await as(a).post("/notes", {
        body: "x",
        taskId: t1.id,
        projectId: q.id
      });

      expect(response.status).toBe(400);
      expect(fieldsOf(response.body)).toContain("projectId");
    });

    it("AC-2 FR-NOTE-004: B's task → 404 Task not found.; B's project → 404 Project not found.", async () => {
      const { a, b } = await seed();
      const bProject = await insertProject(b.id);
      const bTask = await insertTask(b.id, bProject.id);

      const byTask = await as(a).post("/notes", {
        body: "x",
        taskId: bTask.id
      });
      expect(byTask.status).toBe(404);
      expect(byTask.body.detail).toBe("Task not found.");

      const byProject = await as(a).post("/notes", {
        body: "x",
        projectId: bProject.id
      });
      expect(byProject.status).toBe(404);
      expect(byProject.body.detail).toBe("Project not found.");

      expect(await ids(a)).toEqual([]);
    });
  });

  it("AC-3 FR-NOTE-002: projectId, taskId and unlinked filter; more than one → 400; B sees none", async () => {
    const { a, p, t1, q, b } = await seed();
    const n1 = await createNote(a, { body: "General" });
    const n2 = await createNote(a, { body: "On P", projectId: p.id });
    const n3 = await createNote(a, { body: "On T1", taskId: t1.id });
    const n4 = await createNote(a, { body: "On Q", projectId: q.id });
    const sorted = (list: string[]) => [...list].sort();

    expect(sorted(await ids(a, `?projectId=${p.id}`))).toEqual(
      sorted([n2.id, n3.id])
    );
    expect(await ids(a, `?taskId=${t1.id}`)).toEqual([n3.id]);
    expect(await ids(a, "?unlinked=true")).toEqual([n1.id]);
    expect(sorted(await ids(a, "?unlinked=false"))).toEqual(
      sorted([n1.id, n2.id, n3.id, n4.id])
    );
    expect(sorted(await ids(a))).toEqual(sorted([n1.id, n2.id, n3.id, n4.id]));

    const both = await as(a).get(`/notes?projectId=${p.id}&unlinked=true`);
    expect(both.status).toBe(400);
    expect(fieldsOf(both.body)).toContain("projectId");

    const yes = await as(a).get("/notes?unlinked=yes");
    expect(yes.status).toBe(400);
    expect(fieldsOf(yes.body)).toContain("unlinked");

    const bProject = await insertProject(b.id);
    const foreign = await as(a).get(`/notes?projectId=${bProject.id}`);
    expect(foreign.status).toBe(200);
    expect(foreign.body).toMatchObject({ items: [], total: 0 });

    const asB = await as(b).get("/notes");
    expect(asB.status).toBe(200);
    expect(asB.body).toMatchObject({ items: [], total: 0 });
  });

  it("AC-4 FR-NOTE-003: q matches title or body case-insensitively, wildcards literal", async () => {
    const a = await insertUser();
    const titled = await createNote(a, { title: "alpha", body: "x" });
    const inBody = await createNote(a, { body: "The Alphabet" });
    await createNote(a, { title: "beta", body: "y" });
    const percent = await createNote(a, { body: "50% done" });
    await createNote(a, { body: "500 done" });

    expect([...(await ids(a, "?q=ALPHA"))].sort()).toEqual(
      [titled.id, inBody.id].sort()
    );
    expect(await ids(a, `?q=${encodeURIComponent("50%")}`)).toEqual([
      percent.id
    ]);
  });

  it("AC-5 FR-NOTE-003: sort, the range in the user's time zone, its 400s and paging", async () => {
    const a = await insertUser({ time_zone: "Europe/Zagreb" });
    const x = await insertNote(a.id, {
      body: "X",
      created_at: new Date("2026-10-01T08:00:00Z"),
      updated_at: new Date("2026-10-09T22:30:00Z")
    });
    const y = await insertNote(a.id, {
      body: "Y",
      created_at: new Date("2026-10-05T08:00:00Z"),
      updated_at: new Date("2026-10-06T08:00:00Z")
    });

    expect(await ids(a)).toEqual([x.id, y.id]);
    expect(await ids(a, "?sort=createdAt:desc")).toEqual([y.id, x.id]);
    expect(await ids(a, "?sort=updatedAt:asc")).toEqual([y.id, x.id]);
    // 22:30Z on 9 Oct is 00:30 on 10 Oct in Zagreb.
    expect(await ids(a, "?from=2026-10-10")).toEqual([x.id]);
    expect(await ids(a, "?sort=createdAt:asc&to=2026-10-04")).toEqual([x.id]);

    const reversed = await as(a).get("/notes?from=2026-10-10&to=2026-10-09");
    expect(reversed.status).toBe(400);
    expect(reversed.body.errors).toContainEqual({
      field: "from",
      message: "must not be after to"
    });

    expect((await as(a).get("/notes?sort=title:asc")).status).toBe(400);

    const page = await as(a).get("/notes?pageSize=1&page=2");
    expect(page.status).toBe(200);
    expect(page.body).toMatchObject({ page: 2, pageSize: 1, total: 2 });
    expect(page.body.items.map((n) => n.id)).toEqual([y.id]);
  });

  describe("AC-6 FR-NOTE-004: PATCH /notes/{id}", () => {
    it("AC-6 FR-NOTE-004: {body} → title null, link kept, updatedAt later; both link fields null → General", async () => {
      const { a, p, t1 } = await seed();
      const old = await insertNote(a.id, {
        title: "Old",
        body: "old",
        project_id: p.id,
        task_id: t1.id,
        created_at: new Date("2026-10-01T08:00:00Z")
      });

      const patched = await as(a).patch(`/notes/${old.id}`, { body: "new" });

      expect(patched.status, JSON.stringify(patched.body)).toBe(200);
      expect(patched.body).toMatchObject({
        id: old.id,
        title: null,
        body: "new",
        project: ref(p),
        task: ref(t1),
        createdAt: "2026-10-01T08:00:00.000Z"
      });
      expect(Date.parse(patched.body.updatedAt)).toBeGreaterThan(
        Date.parse("2026-10-01T08:00:00Z")
      );

      const general = await as(a).patch(`/notes/${old.id}`, {
        body: "x",
        taskId: null,
        projectId: null
      });
      expect(general.status).toBe(200);
      expect(general.body).toMatchObject({ project: null, task: null });
      expect(await ids(a, "?unlinked=true")).toEqual([old.id]);
    });

    it("AC-6 FR-NOTE-004: no body → 400 naming body", async () => {
      const a = await insertUser();
      const note = await createNote(a);

      const response = await as(a).patch(`/notes/${note.id}`, { title: "t" });

      expect(response.status).toBe(400);
      expect(fieldsOf(response.body)).toContain("body");
    });

    it("AC-6 FR-NOTE-004: B's note, an unknown UUID and abc → 404", async () => {
      const { a, b } = await seed();
      const bNote = await createNote(b, { body: "B's" });

      for (const id of [bNote.id, randomUUID(), "abc"]) {
        const response = await as(a).patch(`/notes/${id}`, { body: "x" });
        expect(response.status, id).toBe(404);
      }
      expect((await read(b, bNote.id))?.body).toBe("B's");
    });
  });

  it("AC-7 FR-NOTE-009: notes keep deleted task and project names and follow a task move", async () => {
    const { a, p, t1, t2, q } = await seed();
    const onTask = await createNote(a, { body: "On T1", taskId: t1.id });
    const onProject = await createNote(a, { body: "On P", projectId: p.id });
    const onMoved = await createNote(a, { body: "On T2", taskId: t2.id });

    await remove(a, "tasks", t1.id);
    expect(await read(a, onTask.id)).toMatchObject({
      project: ref(p),
      task: gone(t1)
    });

    const kept = await as(a).patch(`/notes/${onTask.id}`, { body: "Edited" });
    expect(kept.status).toBe(200);
    expect(kept.body).toMatchObject({ project: ref(p), task: gone(t1) });

    const moved = await as(a).patch(`/tasks/${t2.id}`, { projectId: q.id });
    expect(moved.status, JSON.stringify(moved.body)).toBe(200);
    expect(await read(a, onMoved.id)).toMatchObject({
      project: ref(q),
      task: ref(t2)
    });
    expect(await ids(a, `?projectId=${q.id}`)).toEqual([onMoved.id]);

    await remove(a, "projects", p.id);
    expect(await read(a, onTask.id)).toMatchObject({
      project: gone(p),
      task: gone(t1)
    });
    expect(await read(a, onProject.id)).toMatchObject({
      project: gone(p),
      task: null
    });
    expect(await ids(a, "?unlinked=true")).toEqual([]);

    const relinked = await as(a).patch(`/notes/${onProject.id}`, {
      body: "Relinked",
      projectId: q.id
    });
    expect(relinked.status).toBe(200);
    expect(relinked.body).toMatchObject({ project: ref(q), task: null });
  });

  it("AC-8 FR-NOTE-007: DELETE /notes/{id} → 204, then 404; B's note → 404 and it stays", async () => {
    const { a, b } = await seed();
    const note = await createNote(a);
    const bNote = await createNote(b);

    expect((await as(a).delete(`/notes/${note.id}`)).status).toBe(204);
    expect((await as(a).delete(`/notes/${note.id}`)).status).toBe(404);
    expect(await ids(a)).toEqual([]);

    expect((await as(a).delete(`/notes/${bNote.id}`)).status).toBe(404);
    expect(await ids(b)).toEqual([bNote.id]);
  });
});
