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
import { insertTodo } from "./support/note-test-utils.js";
import {
  insertProject,
  insertTask,
  type ProjectDbRow,
  type TaskDbRow
} from "./support/project-test-utils.js";

interface RefBody {
  id: string | null;
  title: string;
  deleted: boolean;
}

interface TodoBody {
  id: string;
  text: string;
  doneAt: string | null;
  project: RefBody | null;
  task: RefBody | null;
  createdAt: string;
  updatedAt: string;
}

/** Any response body these tests read: a to-do, the list or a Problem. */
interface Body extends TodoBody {
  items: TodoBody[];
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

/** The seeded to-dos' `updated_at`, long before the test runs. */
const SEEDED = "2026-10-01T08:00:00.000Z";

describe("To-dos API (feat-note-todos)", () => {
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

  /** Creates a to-do for `user` over the API and returns it. */
  const createTodo = async (
    user: UserRow,
    fields: Record<string, unknown> = {}
  ): Promise<TodoBody> => {
    const response = await as(user).post("/todos", {
      text: "To-do",
      ...fields
    });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    return response.body;
  };

  /** `GET /todos{query}` → 200; the ids of the items, in order. */
  const ids = async (user: UserRow, query = "") => {
    const response = await as(user).get(`/todos${query}`);
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    return response.body.items.map((t) => t.id);
  };

  /** The to-do `id` as `GET /todos` returns it. */
  const read = async (user: UserRow, id: string) => {
    const response = await as(user).get("/todos");
    expect(response.status).toBe(200);
    return response.body.items.find((t) => t.id === id);
  };

  /** Deletes a project (API-PRJ-005) or a task (API-TSK-005) of `user`. */
  const remove = async (
    user: UserRow,
    kind: "projects" | "tasks",
    id: string
  ) => {
    expect((await as(user).delete(`/${kind}/${id}`)).status).toBe(204);
  };

  describe("AC-9 FR-NOTE-005: POST /todos", () => {
    it("AC-9 FR-NOTE-005: {text} → 201, trimmed, open, General", async () => {
      const a = await insertUser();

      const response = await as(a).post("/todos", { text: " Call " });

      expect(response.status, JSON.stringify(response.body)).toBe(201);
      expect(response.body).toEqual({
        id: response.body.id,
        text: "Call",
        doneAt: null,
        project: null,
        task: null,
        createdAt: response.body.createdAt,
        updatedAt: response.body.createdAt
      });
    });

    it.each<[string, object]>([
      ["no text", {}],
      ["a blank text", { text: "  " }],
      ["a 501-char text", { text: "x".repeat(501) }],
      ["a null text", { text: null }]
    ])("AC-9 FR-NOTE-005: %s → 400 naming text", async (_, body) => {
      const a = await insertUser();

      const response = await as(a).post("/todos", body);

      expect(response.status).toBe(400);
      expect(fieldsOf(response.body)).toContain("text");
      expect(await ids(a)).toEqual([]);
    });

    it("AC-9 FR-NOTE-005: done: true → doneAt set; a task → its project and the task", async () => {
      const { a, p, t1 } = await seed();

      const done = await createTodo(a, { text: "x", done: true });
      expect(done.doneAt).not.toBeNull();
      expect(new Date(done.doneAt!).toISOString()).toBe(done.doneAt);

      const linked = await createTodo(a, { text: "x", taskId: t1.id });
      expect(linked).toMatchObject({ project: ref(p), task: ref(t1) });
    });
  });

  it("AC-10 FR-NOTE-006: PATCH /todos/{id}: done sets and clears doneAt without touching updatedAt; text and link changes do", async () => {
    const { a, p, b } = await seed();
    const row = await insertTodo(a.id, {
      text: "Call",
      created_at: new Date(SEEDED)
    });
    const patch = (body: object) => as(a).patch(`/todos/${row.id}`, body);

    const ticked = await patch({ done: true });
    expect(ticked.status, JSON.stringify(ticked.body)).toBe(200);
    expect(ticked.body.doneAt).not.toBeNull();
    expect(ticked.body.updatedAt).toBe(SEEDED);

    const again = await patch({ done: true });
    expect(again.status).toBe(200);
    expect(again.body.doneAt).toBe(ticked.body.doneAt);

    const reopened = await patch({ done: false });
    expect(reopened.status).toBe(200);
    expect(reopened.body.doneAt).toBeNull();
    expect(reopened.body.updatedAt).toBe(SEEDED);

    const same = await patch({ text: "Call" });
    expect(same.status).toBe(200);
    expect(same.body.updatedAt).toBe(SEEDED);

    const renamed = await patch({ text: "y" });
    expect(renamed.status).toBe(200);
    expect(renamed.body.text).toBe("y");
    expect(Date.parse(renamed.body.updatedAt)).toBeGreaterThan(
      Date.parse(SEEDED)
    );

    const other = await insertTodo(a.id, { created_at: new Date(SEEDED) });
    const linked = await as(a).patch(`/todos/${other.id}`, {
      projectId: p.id
    });
    expect(linked.status).toBe(200);
    expect(linked.body.project).toEqual(ref(p));
    expect(Date.parse(linked.body.updatedAt)).toBeGreaterThan(
      Date.parse(SEEDED)
    );

    const nullDone = await patch({ done: null });
    expect(nullDone.status).toBe(400);
    expect(fieldsOf(nullDone.body)).toContain("done");

    const bTodo = await createTodo(b);
    for (const id of [bTodo.id, randomUUID(), "abc"]) {
      const response = await as(a).patch(`/todos/${id}`, { done: true });
      expect(response.status, id).toBe(404);
    }
    expect((await read(b, bTodo.id))?.doneAt).toBeNull();
  });

  describe("AC-11 FR-NOTE-002: GET /todos", () => {
    it("AC-11 FR-NOTE-002: open and done together, no paging in the body", async () => {
      const a = await insertUser();
      const open = await createTodo(a, { text: "Open" });
      const done = await createTodo(a, { text: "Done", done: true });

      const response = await as(a).get("/todos");

      expect(response.status).toBe(200);
      expect(Object.keys(response.body)).toEqual(["items"]);
      expect(response.body.items.map((t) => t.id).sort()).toEqual(
        [open.id, done.id].sort()
      );
      expect((await as(a).get("/todos?page=1")).status).toBe(400);
    });

    it("AC-11 FR-NOTE-002: projectId, taskId and unlinked filter; more than one → 400; B sees none", async () => {
      const { a, p, t1, q, b } = await seed();
      const n1 = await createTodo(a, { text: "General" });
      const n2 = await createTodo(a, { text: "On P", projectId: p.id });
      const n3 = await createTodo(a, { text: "On T1", taskId: t1.id });
      const n4 = await createTodo(a, { text: "On Q", projectId: q.id });
      const sorted = (list: string[]) => [...list].sort();

      expect(sorted(await ids(a, `?projectId=${p.id}`))).toEqual(
        sorted([n2.id, n3.id])
      );
      expect(await ids(a, `?taskId=${t1.id}`)).toEqual([n3.id]);
      expect(await ids(a, "?unlinked=true")).toEqual([n1.id]);
      expect(sorted(await ids(a))).toEqual(
        sorted([n1.id, n2.id, n3.id, n4.id])
      );

      const both = await as(a).get(`/todos?taskId=${t1.id}&unlinked=true`);
      expect(both.status).toBe(400);
      expect(fieldsOf(both.body)).toContain("projectId");

      expect((await as(a).get("/todos?unlinked=yes")).status).toBe(400);

      const bProject = await insertProject(b.id);
      expect(await ids(a, `?projectId=${bProject.id}`)).toEqual([]);
      expect(await ids(b)).toEqual([]);
    });

    it("AC-11 FR-NOTE-003: q matches the text case-insensitively, wildcards literal", async () => {
      const a = await insertUser();
      const alpha = await createTodo(a, { text: "Call Alpha" });
      await createTodo(a, { text: "beta" });
      const percent = await createTodo(a, { text: "50% done" });
      await createTodo(a, { text: "500 done" });

      expect(await ids(a, "?q=ALPHA")).toEqual([alpha.id]);
      expect(await ids(a, `?q=${encodeURIComponent("50%")}`)).toEqual([
        percent.id
      ]);
    });

    it("AC-11 FR-NOTE-003: sort and the range in the user's time zone, its 400s", async () => {
      const a = await insertUser({ time_zone: "Europe/Zagreb" });
      const x = await insertTodo(a.id, {
        text: "X",
        created_at: new Date("2026-10-01T08:00:00Z"),
        updated_at: new Date("2026-10-09T22:30:00Z")
      });
      const y = await insertTodo(a.id, {
        text: "Y",
        created_at: new Date("2026-10-05T08:00:00Z"),
        updated_at: new Date("2026-10-06T08:00:00Z")
      });

      expect(await ids(a)).toEqual([x.id, y.id]);
      expect(await ids(a, "?sort=createdAt:desc")).toEqual([y.id, x.id]);
      expect(await ids(a, "?sort=updatedAt:asc")).toEqual([y.id, x.id]);
      // 22:30Z on 9 Oct is 00:30 on 10 Oct in Zagreb.
      expect(await ids(a, "?from=2026-10-10")).toEqual([x.id]);
      expect(await ids(a, "?sort=createdAt:asc&to=2026-10-04")).toEqual([x.id]);

      const reversed = await as(a).get("/todos?from=2026-10-10&to=2026-10-09");
      expect(reversed.status).toBe(400);
      expect(reversed.body.errors).toContainEqual({
        field: "from",
        message: "must not be after to"
      });

      expect((await as(a).get("/todos?sort=title:asc")).status).toBe(400);
    });
  });

  it("AC-12 FR-NOTE-009: to-dos keep deleted task and project names and follow a task move", async () => {
    const { a, p, t1, t2, q } = await seed();
    const onTask = await createTodo(a, { text: "On T1", taskId: t1.id });
    const onProject = await createTodo(a, { text: "On P", projectId: p.id });
    const onMoved = await createTodo(a, { text: "On T2", taskId: t2.id });

    await remove(a, "tasks", t1.id);
    expect(await read(a, onTask.id)).toMatchObject({
      project: ref(p),
      task: gone(t1)
    });

    const kept = await as(a).patch(`/todos/${onTask.id}`, { done: true });
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

    const relinked = await as(a).patch(`/todos/${onProject.id}`, {
      projectId: q.id
    });
    expect(relinked.status).toBe(200);
    expect(relinked.body).toMatchObject({ project: ref(q), task: null });
  });

  it("AC-12 FR-NOTE-007: DELETE /todos/{id} → 204, then 404; B's to-do → 404 and it stays", async () => {
    const { a, b } = await seed();
    const todo = await createTodo(a);
    const bTodo = await createTodo(b);

    expect((await as(a).delete(`/todos/${todo.id}`)).status).toBe(204);
    expect((await as(a).delete(`/todos/${todo.id}`)).status).toBe(404);
    expect(await ids(a)).toEqual([]);

    expect((await as(a).delete(`/todos/${bTodo.id}`)).status).toBe(404);
    expect(await ids(b)).toEqual([bTodo.id]);
  });
});
