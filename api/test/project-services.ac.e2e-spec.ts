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
import {
  findTaskRows,
  insertProject,
  insertService,
  insertTask,
  type ProjectDbRow,
  type ServiceDbRow,
  setTaskService
} from "./support/project-test-utils.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

interface ServiceBody {
  id: string;
  name: string;
  taskCount: number;
}

interface ItemBody {
  id: string;
  title: string;
  project: { id: string | null; title: string; deleted: boolean };
  service: { id: string; name: string } | null;
  services: ServiceBody[];
  updatedAt: string;
}

/** Any response body these tests read: a project, a task, a page, the names or a Problem. */
interface Body extends ItemBody {
  items: ItemBody[];
  total: number;
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

/**
 * User A: project P (services "QA", "Design") and project R (service
 * "Backend development"); user B: a project and a service of their own.
 */
interface Fixture {
  a: UserRow;
  b: UserRow;
  p: ProjectDbRow;
  r: ProjectDbRow;
  qa: ServiceDbRow;
  design: ServiceDbRow;
  backend: ServiceDbRow;
  bService: ServiceDbRow;
}

async function seed(): Promise<Fixture> {
  const a = await insertUser();
  const b = await insertUser();
  const p = await insertProject(a.id, { title: "P" });
  const r = await insertProject(a.id, { title: "R" });
  const qa = await insertService(a.id, p.id, "QA");
  const design = await insertService(a.id, p.id, "Design");
  const backend = await insertService(a.id, r.id, "Backend development");
  const bProject = await insertProject(b.id, { title: "B's" });
  const bService = await insertService(b.id, bProject.id, "Consulting");
  return { a, b, p, r, qa, design, backend, bService };
}

describe("Project services API (feat-prj-services)", () => {
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
      post: (url: string, body: object) =>
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

  const namesOf = (services: ServiceBody[]) => services.map((s) => s.name);

  it("AC-1 FR-PRJ-009: POST with services → trimmed, A–Z, each with an id and taskCount 0; without services → []", async () => {
    const a = await insertUser();

    const created = await as(a).post("/projects", {
      title: "Web",
      services: [" QA ", "Design"]
    });

    expect(created.status).toBe(201);
    expect(created.body.services).toEqual([
      {
        id: expect.stringMatching(UUID_RE) as string,
        name: "Design",
        taskCount: 0
      },
      { id: expect.stringMatching(UUID_RE) as string, name: "QA", taskCount: 0 }
    ]);
    const fetched = await as(a).get(`/projects/${created.body.id}`);
    expect(fetched.body.services).toEqual(created.body.services);

    const bare = await as(a).post("/projects", { title: "Bare" });
    expect(bare.status).toBe(201);
    expect(bare.body.services).toEqual([]);
  });

  it("AC-2 FR-PRJ-009: invalid services → 400 on field services, nothing saved", async () => {
    const { a, p } = await seed();
    const cases: [string, unknown][] = [
      ["a 51-char name", ["x".repeat(51)]],
      ["21 names", Array.from({ length: 21 }, (_, i) => `S${i}`)],
      ["a duplicate ignoring case", ["QA", "qa"]],
      ["an empty name", [""]],
      ["a blank name", ["   "]],
      ["a number", [1]]
    ];

    for (const [label, services] of cases) {
      const created = await as(a).post("/projects", { title: "X", services });
      expect(created.status, `POST ${label}`).toBe(400);
      expect(fieldsOf(created.body), `POST ${label}`).toContain("services");

      const updated = await as(a).patch(`/projects/${p.id}`, { services });
      expect(updated.status, `PATCH ${label}`).toBe(400);
      expect(fieldsOf(updated.body), `PATCH ${label}`).toContain("services");
    }

    const duplicate = await as(a).post("/projects", {
      title: "X",
      services: ["QA", "qa"]
    });
    expect(duplicate.body.errors).toContainEqual({
      field: "services",
      message: "services must not repeat a name (ignoring case)"
    });

    const nulled = await as(a).patch(`/projects/${p.id}`, { services: null });
    expect(nulled.status).toBe(400);
    expect(fieldsOf(nulled.body)).toContain("services");

    // Nothing saved: only the seeded P and R exist, and P keeps its services.
    expect((await as(a).get("/projects")).body.total).toBe(2);
    expect(
      namesOf((await as(a).get(`/projects/${p.id}`)).body.services)
    ).toEqual(["Design", "QA"]);
  });

  it("AC-3 FR-PRJ-009: PATCH services replaces the list; a name kept ignoring case keeps its id; a removed service's tasks get service null and keep updatedAt", async () => {
    const { a, p, qa, design } = await seed();
    const onDesign = await insertTask(a.id, p.id, { title: "On Design" });
    await setTaskService(onDesign.id, design.id);
    const before = (await findTaskRows(p.id)).find(
      (t) => t.id === onDesign.id
    )!;

    const response = await as(a).patch(`/projects/${p.id}`, {
      services: ["qa", "Content"]
    });

    expect(response.status).toBe(200);
    expect(response.body.services).toEqual([
      {
        id: expect.stringMatching(UUID_RE) as string,
        name: "Content",
        taskCount: 0
      },
      { id: qa.id, name: "qa", taskCount: 0 }
    ]);
    const task = await as(a).get(`/tasks/${onDesign.id}`);
    expect(task.body.service).toBeNull();
    expect(task.body.updatedAt).toBe(before.updated_at.toISOString());
  });

  it("AC-4 FR-PRJ-009: PATCH without services keeps them; services [] removes them all", async () => {
    const { a, p } = await seed();

    const renamed = await as(a).patch(`/projects/${p.id}`, { title: "P2" });
    expect(renamed.status).toBe(200);
    expect(namesOf(renamed.body.services)).toEqual(["Design", "QA"]);

    const emptied = await as(a).patch(`/projects/${p.id}`, { services: [] });
    expect(emptied.status).toBe(200);
    expect(emptied.body.services).toEqual([]);
    expect((await as(a).get(`/projects/${p.id}`)).body.services).toEqual([]);
  });

  it("AC-5 FR-PRJ-009: taskCount counts the project's tasks on each service, in GET /projects/{id} and GET /projects", async () => {
    const { a, p, qa, design } = await seed();
    for (const title of ["One", "Two"]) {
      const task = await insertTask(a.id, p.id, { title });
      await setTaskService(task.id, qa.id);
    }
    await insertTask(a.id, p.id, { title: "No service" });

    const expected = [
      { id: design.id, name: "Design", taskCount: 0 },
      { id: qa.id, name: "QA", taskCount: 2 }
    ];
    expect((await as(a).get(`/projects/${p.id}`)).body.services).toEqual(
      expected
    );
    const list = await as(a).get("/projects");
    expect(list.body.items.find((item) => item.id === p.id)?.services).toEqual(
      expected
    );
  });

  it("AC-6 FR-PRJ-009: GET /projects/service-names → the caller's names once ignoring case, A–Z; none → []; no token → 401", async () => {
    const { a, r } = await seed();
    await insertService(a.id, r.id, "qa");

    const response = await as(a).get("/projects/service-names");

    expect(response.status).toBe(200);
    const names = response.body.items as unknown as string[];
    expect(names).toHaveLength(3);
    expect(names.slice(0, 2)).toEqual(["Backend development", "Design"]);
    expect(names[2].toLowerCase()).toBe("qa");
    expect(names).not.toContain("Consulting");

    const c = await insertUser();
    const none = await as(c).get("/projects/service-names");
    expect(none.status).toBe(200);
    expect(none.body.items).toEqual([]);

    const anonymous = await request(app.getHttpServer()).get(
      "/api/v1/projects/service-names"
    );
    expect(anonymous.status).toBe(401);
  });

  it("AC-7 FR-PRJ-009: DELETE /projects/{id} removes its services", async () => {
    const { a, p } = await seed();

    expect((await as(a).delete(`/projects/${p.id}`)).status).toBe(204);

    const names = await as(a).get("/projects/service-names");
    expect(names.status).toBe(200);
    expect(names.body.items).toEqual(["Backend development"]);
  });

  it("AC-8 FR-TSK-009: POST /tasks with a serviceId of its project → service {id, name}; without → null", async () => {
    const { a, p, qa } = await seed();

    const linked = await as(a).post("/tasks", {
      projectId: p.id,
      title: "Linked",
      serviceId: qa.id
    });
    expect(linked.status).toBe(201);
    expect(linked.body.service).toEqual({ id: qa.id, name: "QA" });

    const bare = await as(a).post("/tasks", { projectId: p.id, title: "Bare" });
    expect(bare.status).toBe(201);
    expect(bare.body.service).toBeNull();
  });

  it("AC-9 FR-TSK-009: a serviceId of another project, another user or unknown → 400 serviceId; a non-UUID → 400 serviceId", async () => {
    const { a, p, backend, bService } = await seed();
    const cases: [string, string][] = [
      ["another project's", backend.id],
      ["another user's", bService.id],
      ["an unknown", randomUUID()]
    ];

    for (const [label, serviceId] of cases) {
      const response = await as(a).post("/tasks", {
        projectId: p.id,
        title: "T",
        serviceId
      });
      expect(response.status, label).toBe(400);
      expect(response.body.errors, label).toContainEqual({
        field: "serviceId",
        message: "must be one of the project's services"
      });
    }

    const malformed = await as(a).post("/tasks", {
      projectId: p.id,
      title: "T",
      serviceId: "x"
    });
    expect(malformed.status).toBe(400);
    expect(fieldsOf(malformed.body)).toContain("serviceId");

    expect((await as(a).get(`/tasks?projectId=${p.id}`)).body.total).toBe(0);
  });

  it("AC-10 FR-TSK-009: PATCH serviceId sets it, null clears it, other fields keep it", async () => {
    const { a, p, design } = await seed();
    const t = await insertTask(a.id, p.id);

    const set = await as(a).patch(`/tasks/${t.id}`, { serviceId: design.id });
    expect(set.status).toBe(200);
    expect(set.body.service).toEqual({ id: design.id, name: "Design" });

    const kept = await as(a).patch(`/tasks/${t.id}`, { title: "Renamed" });
    expect(kept.status).toBe(200);
    expect(kept.body.service).toEqual({ id: design.id, name: "Design" });

    const cleared = await as(a).patch(`/tasks/${t.id}`, { serviceId: null });
    expect(cleared.status).toBe(200);
    expect(cleared.body.service).toBeNull();
  });

  it("AC-11 FR-TSK-009: a move clears the service unless it names one of the new project's; a service of the old project → 400, task unchanged", async () => {
    const { a, p, r, qa, backend } = await seed();
    const onQa = async () => {
      const task = await insertTask(a.id, p.id);
      await setTaskService(task.id, qa.id);
      return task;
    };

    const moved = await onQa();
    const plain = await as(a).patch(`/tasks/${moved.id}`, { projectId: r.id });
    expect(plain.status).toBe(200);
    expect(plain.body.project.id).toBe(r.id);
    expect(plain.body.service).toBeNull();

    const relinked = await onQa();
    const withService = await as(a).patch(`/tasks/${relinked.id}`, {
      projectId: r.id,
      serviceId: backend.id
    });
    expect(withService.status).toBe(200);
    expect(withService.body.service).toEqual({
      id: backend.id,
      name: "Backend development"
    });

    const refused = await onQa();
    const wrong = await as(a).patch(`/tasks/${refused.id}`, {
      projectId: r.id,
      serviceId: qa.id
    });
    expect(wrong.status).toBe(400);
    expect(wrong.body.errors).toContainEqual({
      field: "serviceId",
      message: "must be one of the project's services"
    });
    const unchanged = await as(a).get(`/tasks/${refused.id}`);
    expect(unchanged.body.project.id).toBe(p.id);
    expect(unchanged.body.service).toEqual({ id: qa.id, name: "QA" });

    const stayed = await onQa();
    const same = await as(a).patch(`/tasks/${stayed.id}`, { projectId: p.id });
    expect(same.status).toBe(200);
    expect(same.body.service).toEqual({ id: qa.id, name: "QA" });
  });

  it("AC-12 FR-TSK-009: GET /tasks?projectId= and GET /tasks/{id} show each task's service", async () => {
    const { a, p, qa } = await seed();
    const linked = await insertTask(a.id, p.id, { title: "Linked" });
    await setTaskService(linked.id, qa.id);
    const bare = await insertTask(a.id, p.id, { title: "Bare" });

    const list = await as(a).get(`/tasks?projectId=${p.id}`);
    expect(list.status).toBe(200);
    const byId = new Map(list.body.items.map((t) => [t.id, t.service]));
    expect(byId.get(linked.id)).toEqual({ id: qa.id, name: "QA" });
    expect(byId.get(bare.id)).toBeNull();

    expect((await as(a).get(`/tasks/${linked.id}`)).body.service).toEqual({
      id: qa.id,
      name: "QA"
    });
    expect((await as(a).get(`/tasks/${bare.id}`)).body.service).toBeNull();
  });
});
