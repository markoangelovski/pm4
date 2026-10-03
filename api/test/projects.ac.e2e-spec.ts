import { randomUUID } from "node:crypto";
import { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { createTestApp } from "./create-test-app.js";
import {
  accessTokenFor,
  closeTestClients,
  deleteTestUsers,
  deleteUser,
  insertUser,
  type UserRow
} from "./support/auth-test-utils.js";
import {
  findProjectRow,
  findTaskRows,
  insertProject,
  insertTask,
  setUserDisplayName
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

interface ProjectBody {
  id: string;
  title: string;
  description: string | null;
  externalLink: string | null;
  projectLead: LeadBody | null;
  taskCounts: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

/** Any response body these tests read: a project, a page of them or a Problem. */
interface Body extends ProjectBody {
  items: ProjectBody[];
  total: number;
  page: number;
  pageSize: number;
  type: string;
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

describe("Projects API (feat-prj-api)", () => {
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

  it("AC-1 API-PRJ-001: POST with a title only → 201 with defaults and a trimmed title", async () => {
    const a = await insertUser();

    const response = await as(a).post("/projects", { title: "  Web  " });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: response.body.id,
      title: "Web",
      description: null,
      externalLink: null,
      projectLead: null,
      taskCounts: { upcoming: 0, inProgress: 0, completed: 0, total: 0 },
      createdAt: response.body.createdAt,
      updatedAt: response.body.updatedAt
    });
    expect(response.body.id).toMatch(UUID_RE);
    expect(response.body.createdAt).toMatch(ISO_RE);
    expect(response.body.updatedAt).toBe(response.body.createdAt);
  });

  it("AC-2 API-PRJ-001: POST with every field and a user lead → the lead object, no email anywhere", async () => {
    const a = await insertUser();
    const b = await insertUser({
      display_name: "Barbara Liskov",
      avatar_url: "https://lh3.googleusercontent.com/a/barbara"
    });

    const response = await as(a).post("/projects", {
      title: "Compiler",
      description: "Line one\nLine two",
      externalLink: "https://example.com/compiler",
      projectLeadUserId: b.id
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      title: "Compiler",
      description: "Line one\nLine two",
      externalLink: "https://example.com/compiler",
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

  it("AC-3 API-PRJ-001: a text lead is trimmed; empty strings become null", async () => {
    const a = await insertUser();

    const text = await as(a).post("/projects", {
      title: "Text lead",
      projectLeadName: "  Ana "
    });
    expect(text.status).toBe(201);
    expect(text.body.projectLead).toEqual({
      kind: "text",
      name: "Ana",
      user: null
    });

    const empty = await as(a).post("/projects", {
      title: "Empty fields",
      description: "",
      externalLink: "  ",
      projectLeadName: ""
    });
    expect(empty.status).toBe(201);
    expect(empty.body).toMatchObject({
      description: null,
      externalLink: null,
      projectLead: null
    });
  });

  describe("AC-4 API-PRJ-001: invalid bodies → 400 validation with the field", () => {
    const cases: [string, () => object, string][] = [
      ["no title", () => ({}), "title"],
      ["a blank title", () => ({ title: "   " }), "title"],
      ["a 201-char title", () => ({ title: "x".repeat(201) }), "title"],
      [
        "a 2001-char description",
        () => ({ title: "T", description: "x".repeat(2001) }),
        "description"
      ],
      [
        "an ftp link",
        () => ({ title: "T", externalLink: "ftp://x" }),
        "externalLink"
      ],
      [
        "a link that isn't a URL",
        () => ({ title: "T", externalLink: "not a url" }),
        "externalLink"
      ],
      [
        "a 501-char link",
        () => ({
          title: "T",
          externalLink: `https://example.com/${"x".repeat(481)}`
        }),
        "externalLink"
      ],
      [
        "a 101-char lead name",
        () => ({ title: "T", projectLeadName: "x".repeat(101) }),
        "projectLeadName"
      ],
      [
        "both lead fields",
        () => ({
          title: "T",
          projectLeadUserId: leadUserId,
          projectLeadName: "Ana"
        }),
        "projectLeadName"
      ],
      [
        "an unknown user as lead",
        () => ({ title: "T", projectLeadUserId: randomUUID() }),
        "projectLeadUserId"
      ],
      [
        "a lead user id that isn't a UUID",
        () => ({ title: "T", projectLeadUserId: "abc" }),
        "projectLeadUserId"
      ],
      ["an unknown field", () => ({ title: "T", color: "red" }), "color"]
    ];

    let a: UserRow;
    let leadUserId: string;

    beforeAll(async () => {
      a = await insertUser();
      leadUserId = (await insertUser()).id;
    });

    it.each(cases)("AC-4 API-PRJ-001: %s → 400", async (_, body, field) => {
      const response = await as(a).post("/projects", body());

      expect(response.status).toBe(400);
      expect(response.body.type).toBe(errorType("validation"));
      expect(fieldsOf(response.body)).toContain(field);
    });
  });

  it("AC-5 API-PRJ-002: the list holds only A's active projects, with live task counts", async () => {
    const a = await insertUser();
    const b = await insertUser();
    const counted = await insertProject(a.id, { title: "Counted" });
    for (const status of [
      "upcoming",
      "upcoming",
      "in-progress",
      "completed"
    ] as const) {
      await insertTask(a.id, counted.id, { status });
    }
    await insertTask(a.id, counted.id, {
      status: "completed",
      deleted_at: new Date()
    });
    await insertProject(a.id, { title: "Trashed", deleted_at: new Date() });
    await insertProject(b.id, { title: "B's project" });

    const response = await as(a).get("/projects");

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({
      id: counted.id,
      title: "Counted",
      taskCounts: { upcoming: 2, inProgress: 1, completed: 1, total: 4 }
    });
  });

  it("AC-6 API-PRJ-002: q matches the title case-insensitively, with LIKE wildcards escaped", async () => {
    const a = await insertUser();
    for (const title of [
      "My Web App",
      "WEBSITE",
      "Other",
      "50% off",
      "500",
      "a_b",
      "axb"
    ]) {
      await insertProject(a.id, { title });
    }
    const titles = async (q: string) => {
      const response = await as(a).get(`/projects?q=${encodeURIComponent(q)}`);
      expect(response.status).toBe(200);
      return (response.body.items as { title: string }[])
        .map((p) => p.title)
        .sort();
    };

    expect(await titles("web")).toEqual(["My Web App", "WEBSITE"]);
    expect(await titles("50%")).toEqual(["50% off"]);
    expect(await titles("a_b")).toEqual(["a_b"]);
    expect(await titles("")).toHaveLength(7);

    const tooLong = await as(a).get(`/projects?q=${"x".repeat(201)}`);
    expect(tooLong.status).toBe(400);
    expect(fieldsOf(tooLong.body)).toContain("q");
  });

  it("AC-7 API-PRJ-002: sorting by updatedAt (default), title and createdAt; an unknown sort → 400", async () => {
    const a = await insertUser();
    await insertProject(a.id, {
      title: "gamma",
      created_at: daysAgo(3),
      updated_at: daysAgo(1)
    });
    await insertProject(a.id, {
      title: "alpha",
      created_at: daysAgo(2),
      updated_at: daysAgo(3)
    });
    await insertProject(a.id, {
      title: "Beta",
      created_at: daysAgo(1),
      updated_at: daysAgo(2)
    });
    const titles = async (query: string) => {
      const response = await as(a).get(`/projects${query}`);
      expect(response.status).toBe(200);
      return (response.body.items as { title: string }[]).map((p) => p.title);
    };

    expect(await titles("")).toEqual(["gamma", "Beta", "alpha"]);
    expect(await titles("?sort=title:asc")).toEqual(["alpha", "Beta", "gamma"]);
    expect(await titles("?sort=createdAt:asc")).toEqual([
      "gamma",
      "alpha",
      "Beta"
    ]);

    const unknown = await as(a).get("/projects?sort=name:asc");
    expect(unknown.status).toBe(400);
    expect(fieldsOf(unknown.body)).toContain("sort");
  });

  it("AC-8 API-PRJ-002: pagination with page and pageSize; out-of-range values → 400", async () => {
    const a = await insertUser();
    for (const title of ["one", "two", "three"]) {
      await insertProject(a.id, { title });
    }

    const second = await as(a).get("/projects?pageSize=2&page=2");
    expect(second.status).toBe(200);
    expect(second.body).toMatchObject({ total: 3, page: 2, pageSize: 2 });
    expect(second.body.items).toHaveLength(1);

    const beyond = await as(a).get("/projects?page=5");
    expect(beyond.status).toBe(200);
    expect(beyond.body).toMatchObject({ items: [], total: 3 });

    for (const query of ["page=0", "pageSize=0", "pageSize=101"]) {
      const response = await as(a).get(`/projects?${query}`);
      expect(response.status, query).toBe(400);
      expect(response.body.type).toBe(errorType("validation"));
    }
  });

  it("AC-9 API-PRJ-003: GET one: own → 200; another user's, unknown or malformed → not-found; trashed → in-trash", async () => {
    const a = await insertUser();
    const b = await insertUser();
    const created = await as(a).post("/projects", { title: "Mine" });
    const bs = await insertProject(b.id, { title: "B's" });
    const trashed = await insertProject(a.id, {
      title: "Trashed",
      deleted_at: new Date()
    });

    const own = await as(a).get(`/projects/${created.body.id}`);
    expect(own.status).toBe(200);
    expect(own.body).toEqual(created.body);

    for (const id of [bs.id, randomUUID(), "abc"]) {
      const response = await as(a).get(`/projects/${id}`);
      expect(response.status, id).toBe(404);
      expect(response.body.type).toBe(errorType("not-found"));
    }

    const inTrash = await as(a).get(`/projects/${trashed.id}`);
    expect(inTrash.status).toBe(404);
    expect(inTrash.headers["content-type"]).toContain(
      "application/problem+json"
    );
    expect(inTrash.body).toMatchObject({
      type: errorType("in-trash"),
      title: "Not Found",
      status: 404
    });
  });

  it("AC-10 API-PRJ-004: PATCH changes only the given fields and bumps updatedAt", async () => {
    const a = await insertUser();
    const b = await insertUser({ display_name: "Barbara Liskov" });
    const seeded = await insertProject(a.id, {
      title: "Old",
      description: "Desc",
      external_link: "https://example.com/old",
      created_at: daysAgo(5),
      updated_at: daysAgo(5)
    });
    const url = `/projects/${seeded.id}`;

    const renamed = await as(a).patch(url, { title: "New" });
    expect(renamed.status).toBe(200);
    expect(renamed.body.title).toBe("New");
    expect(renamed.body.createdAt).toBe(seeded.created_at.toISOString());
    expect(Date.parse(renamed.body.updatedAt)).toBeGreaterThan(
      seeded.updated_at.getTime()
    );

    const cleared = await as(a).patch(url, {
      description: null,
      externalLink: ""
    });
    expect(cleared.status).toBe(200);
    expect(cleared.body).toMatchObject({
      title: "New",
      description: null,
      externalLink: null
    });

    const before = (await findProjectRow(seeded.id))!.updated_at;
    await new Promise((resolve) => setTimeout(resolve, 5));
    const empty = await as(a).patch(url, {});
    expect(empty.status).toBe(200);
    expect(Date.parse(empty.body.updatedAt)).toBeGreaterThan(before.getTime());

    const nullTitle = await as(a).patch(url, { title: null });
    expect(nullTitle.status).toBe(400);
    expect(fieldsOf(nullTitle.body)).toContain("title");

    const withLead = await as(a).patch(url, { projectLeadUserId: b.id });
    expect(withLead.body.projectLead).toMatchObject({
      kind: "user",
      user: { id: b.id }
    });
    const keepsLead = await as(a).patch(url, { description: "d" });
    expect(keepsLead.status).toBe(200);
    expect(keepsLead.body.projectLead).toMatchObject({
      kind: "user",
      user: { id: b.id }
    });
    const toText = await as(a).patch(url, { projectLeadName: "X" });
    expect(toText.body.projectLead).toEqual({
      kind: "text",
      name: "X",
      user: null
    });
    await as(a).patch(url, { projectLeadUserId: b.id });
    const noLead = await as(a).patch(url, { projectLeadUserId: null });
    expect(noLead.status).toBe(200);
    expect(noLead.body.projectLead).toBeNull();

    const other = await insertUser();
    const bs = await insertProject(other.id);
    const foreign = await as(a).patch(`/projects/${bs.id}`, { title: "X" });
    expect(foreign.status).toBe(404);
    expect(foreign.body.type).toBe(errorType("not-found"));

    const trashed = await insertProject(a.id, { deleted_at: new Date() });
    const inTrash = await as(a).patch(`/projects/${trashed.id}`, {
      title: "X"
    });
    expect(inTrash.status).toBe(404);
    expect(inTrash.body.type).toBe(errorType("in-trash"));
  });

  it("AC-11 API-PRJ-003: a user lead shows the user's current name; once the user is gone, the saved name as text", async () => {
    const a = await insertUser();
    const b = await insertUser({ display_name: "Barbara Liskov" });
    const created = await as(a).post("/projects", {
      title: "Lead",
      projectLeadUserId: b.id
    });
    const url = `/projects/${created.body.id}`;

    await setUserDisplayName(b.id, "Barbara L.");
    const renamed = await as(a).get(url);
    expect(renamed.body.projectLead).toMatchObject({
      kind: "user",
      name: "Barbara L.",
      user: { id: b.id, displayName: "Barbara L." }
    });

    await deleteUser(b.id);
    const gone = await as(a).get(url);
    expect(gone.status).toBe(200);
    expect(gone.body.projectLead).toEqual({
      kind: "text",
      name: "Barbara Liskov",
      user: null
    });
  });

  it("AC-12 API-PRJ-005: DELETE moves the project to the trash, leaving its tasks and updatedAt alone", async () => {
    const a = await insertUser();
    const b = await insertUser();
    const project = await insertProject(a.id, {
      title: "To trash",
      updated_at: daysAgo(2)
    });
    await insertTask(a.id, project.id);
    const url = `/projects/${project.id}`;

    const deleted = await as(a).delete(url);
    expect(deleted.status).toBe(204);

    const read = await as(a).get(url);
    expect(read.status).toBe(404);
    expect(read.body.type).toBe(errorType("in-trash"));
    const list = await as(a).get("/projects");
    expect(list.body.items).toEqual([]);
    const row = (await findProjectRow(project.id))!;
    expect(row.deleted_at).not.toBeNull();
    expect(row.updated_at.toISOString()).toBe(project.updated_at.toISOString());
    expect((await findTaskRows(project.id)).map((t) => t.deleted_at)).toEqual([
      null
    ]);

    const again = await as(a).delete(url);
    expect(again.status).toBe(404);
    expect(again.body.type).toBe(errorType("in-trash"));

    const bs = await insertProject(b.id);
    const foreign = await as(a).delete(`/projects/${bs.id}`);
    expect(foreign.status).toBe(404);
    expect(foreign.body.type).toBe(errorType("not-found"));
  });

  it("AC-13 API-PRJ-006: restore brings a trashed project back; individually deleted tasks stay out", async () => {
    const a = await insertUser();
    const b = await insertUser();
    const project = await insertProject(a.id, { title: "Restore me" });
    await insertTask(a.id, project.id, { status: "upcoming" });
    await insertTask(a.id, project.id, {
      status: "completed",
      deleted_at: daysAgo(1)
    });
    const url = `/projects/${project.id}`;
    expect((await as(a).delete(url)).status).toBe(204);

    const restored = await as(a).post(`${url}/restore`);
    expect(restored.status).toBe(204);
    const read = await as(a).get(url);
    expect(read.status).toBe(200);
    expect(read.body.taskCounts).toEqual({
      upcoming: 1,
      inProgress: 0,
      completed: 0,
      total: 1
    });

    const before = (await findProjectRow(project.id))!;
    const active = await as(a).post(`${url}/restore`);
    expect(active.status).toBe(204);
    const after = (await findProjectRow(project.id))!;
    expect(after.deleted_at).toBeNull();
    expect(after.updated_at.toISOString()).toBe(
      before.updated_at.toISOString()
    );

    const bs = await insertProject(b.id, { deleted_at: new Date() });
    const foreign = await as(a).post(`/projects/${bs.id}/restore`);
    expect(foreign.status).toBe(404);
    expect(foreign.body.type).toBe(errorType("not-found"));
  });

  it("AC-14 FR-PRJ-007: being a project's lead gives no access to it", async () => {
    const a = await insertUser();
    const b = await insertUser();
    const created = await as(a).post("/projects", {
      title: "A's project",
      projectLeadUserId: b.id
    });
    expect(created.status).toBe(201);

    const list = await as(b).get("/projects");
    expect(list.status).toBe(200);
    expect(list.body.items).toEqual([]);

    const read = await as(b).get(`/projects/${created.body.id}`);
    expect(read.status).toBe(404);
    expect(read.body.type).toBe(errorType("not-found"));
  });

  it("AC-15 API-PRJ-001…006: every /projects endpoint without a token → 401", async () => {
    const server = app.getHttpServer();
    const id = randomUUID();
    // Built one at a time: supertest closes its ephemeral server after a request.
    const calls = [
      () => request(server).get("/api/v1/projects"),
      () => request(server).post("/api/v1/projects").send({ title: "T" }),
      () => request(server).get(`/api/v1/projects/${id}`),
      () =>
        request(server).patch(`/api/v1/projects/${id}`).send({ title: "T" }),
      () => request(server).delete(`/api/v1/projects/${id}`),
      () => request(server).post(`/api/v1/projects/${id}/restore`)
    ];

    for (const call of calls) {
      const response = await send(call());
      expect(response.status).toBe(401);
      expect(response.body.type).toBe(errorType("unauthorized"));
    }
  });
});
