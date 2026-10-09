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
  insertProject,
  insertTask,
  type ProjectDbRow,
  type TaskDbRow
} from "./support/project-test-utils.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const errorType = (slug: string) => `${process.env.WEB_APP_URL}/errors/${slug}`;

/** Noon in Zagreb on 2026-10-07: "today" for a user in `Europe/Zagreb`. */
const NOW = new Date("2026-10-07T10:00:00.000Z");
const TODAY = "2026-10-07";
const TOMORROW = "2026-10-08";

interface RefBody {
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
  project: RefBody | null;
  task: RefBody | null;
  excludeFromStats: boolean;
}

/** Any response body these tests read: a log, a day, a workday list or a Problem. */
interface Body extends TimeLogBody {
  startMinute: number | null;
  totalMinutes: number;
  logs: TimeLogBody[];
  items: { workDate: string; startMinute: number; totalMinutes: number }[];
  type: string;
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

async function trashTask(id: string): Promise<void> {
  await testDb().query("UPDATE tasks SET deleted_at = now() WHERE id = $1", [
    id
  ]);
}

async function trashProject(id: string): Promise<void> {
  await testDb().query("UPDATE projects SET deleted_at = now() WHERE id = $1", [
    id
  ]);
}

describe("Time logging API (feat-tlog-api)", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    // Only `Date` is faked, so "today" is fixed and timers still run.
    vi.useFakeTimers({ toFake: ["Date"], now: NOW });
    app = await createTestApp();
  });

  afterAll(async () => {
    await deleteTestUsers();
    await closeTestClients();
    await app.close();
    vi.useRealTimers();
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
      put: (url: string, body: object) =>
        send(
          request(server)
            .put(`/api/v1${url}`)
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

  /** Creates a log for `user` on `workDate` (default today, day start 09:00) and returns it. */
  const createLog = async (
    user: UserRow,
    fields: Record<string, unknown> = {}
  ): Promise<TimeLogBody> => {
    const response = await as(user).post("/time-logs", {
      workDate: TODAY,
      durationMinutes: 30,
      text: "Work",
      dayStartMinute: 540,
      ...fields
    });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    return response.body;
  };

  const getDay = async (user: UserRow, date: string): Promise<Body> => {
    const response = await as(user).get(`/workdays/${date}`);
    expect(response.status).toBe(200);
    return response.body;
  };

  /** User A with projects P, Q, a task T of P and a task U of Q. */
  const seedA = async () => {
    const a = await insertUser({ time_zone: "Europe/Zagreb" });
    const p = await insertProject(a.id, { title: "Website" });
    const q = await insertProject(a.id, { title: "Mobile" });
    const t = await insertTask(a.id, p.id, { title: "Landing page" });
    const u = await insertTask(a.id, q.id, { title: "Login screen" });
    return { a, p, q, t, u };
  };

  const ref = (row: ProjectDbRow | TaskDbRow, deleted = false) => ({
    id: row.id,
    title: row.title,
    deleted
  });

  it("AC-3 API-TLOG-002: POST the first log of a date → 201, trimmed text, no link; the day has the start and the log", async () => {
    const a = await insertUser({ time_zone: "Europe/Zagreb" });

    const response = await as(a).post("/time-logs", {
      workDate: TODAY,
      durationMinutes: 15,
      text: " Specs review ",
      dayStartMinute: 540
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: response.body.id,
      workDate: TODAY,
      durationMinutes: 15,
      text: "Specs review",
      title: null,
      project: null,
      task: null,
      excludeFromStats: false
    });
    expect(response.body.id).toMatch(UUID_RE);

    expect(await getDay(a, TODAY)).toEqual({
      workDate: TODAY,
      startMinute: 540,
      totalMinutes: 15,
      logs: [response.body]
    });
  });

  it("AC-4 API-TLOG-002: later logs of the date don't need dayStartMinute, and a different one is ignored", async () => {
    const a = await insertUser();
    await createLog(a, { dayStartMinute: 540 });

    const without = await as(a).post("/time-logs", {
      workDate: TODAY,
      durationMinutes: 15,
      text: "Second"
    });
    expect(without.status).toBe(201);

    const different = await as(a).post("/time-logs", {
      workDate: TODAY,
      durationMinutes: 15,
      text: "Third",
      dayStartMinute: 600
    });
    expect(different.status).toBe(201);

    const day = await getDay(a, TODAY);
    expect(day.startMinute).toBe(540);
    expect(day.logs).toHaveLength(3);
  });

  describe("AC-5 API-TLOG-002: the first log of a date needs a valid dayStartMinute", () => {
    it("AC-5 API-TLOG-002: no workday and no dayStartMinute → 400 naming dayStartMinute, nothing created", async () => {
      const a = await insertUser();

      const response = await as(a).post("/time-logs", {
        workDate: TODAY,
        durationMinutes: 15,
        text: "Work"
      });

      expect(response.status).toBe(400);
      expect(response.body.type).toBe(errorType("validation"));
      expect(fieldsOf(response.body)).toContain("dayStartMinute");
      expect(await getDay(a, TODAY)).toEqual({
        workDate: TODAY,
        startMinute: null,
        totalMinutes: 0,
        logs: []
      });
    });

    it.each([500, 1440, -15])(
      "AC-5 API-TLOG-002: dayStartMinute %s → 400",
      async (dayStartMinute) => {
        const a = await insertUser();

        const response = await as(a).post("/time-logs", {
          workDate: TODAY,
          durationMinutes: 15,
          text: "Work",
          dayStartMinute
        });

        expect(response.status).toBe(400);
        expect(fieldsOf(response.body)).toContain("dayStartMinute");
        expect((await getDay(a, TODAY)).logs).toEqual([]);
      }
    );
  });

  describe("AC-6 API-TLOG-002: invalid bodies → 400 naming the field", () => {
    let a: UserRow;

    beforeAll(async () => {
      a = await insertUser();
    });

    const valid = {
      workDate: TODAY,
      durationMinutes: 30,
      text: "Work",
      dayStartMinute: 540
    };
    const without = (key: keyof typeof valid) => {
      const body: Record<string, unknown> = { ...valid };
      delete body[key];
      return body;
    };

    const cases: [string, object, string][] = [
      ["no text", without("text"), "text"],
      ["a blank text", { ...valid, text: "   " }, "text"],
      ["a 1001-char text", { ...valid, text: "x".repeat(1001) }, "text"],
      ["a 101-char title", { ...valid, title: "x".repeat(101) }, "title"],
      [
        "durationMinutes 0",
        { ...valid, durationMinutes: 0 },
        "durationMinutes"
      ],
      [
        "durationMinutes 10",
        { ...valid, durationMinutes: 10 },
        "durationMinutes"
      ],
      [
        "durationMinutes 20",
        { ...valid, durationMinutes: 20 },
        "durationMinutes"
      ],
      [
        "durationMinutes 1455",
        { ...valid, durationMinutes: 1455 },
        "durationMinutes"
      ],
      [
        'durationMinutes "1h"',
        { ...valid, durationMinutes: "1h" },
        "durationMinutes"
      ],
      ["no durationMinutes", without("durationMinutes"), "durationMinutes"],
      ["workDate 2026-02-30", { ...valid, workDate: "2026-02-30" }, "workDate"],
      ["workDate 07.10.2026", { ...valid, workDate: "07.10.2026" }, "workDate"],
      ["no workDate", without("workDate"), "workDate"],
      ["a future workDate", { ...valid, workDate: TOMORROW }, "workDate"],
      [
        'excludeFromStats "yes"',
        { ...valid, excludeFromStats: "yes" },
        "excludeFromStats"
      ],
      [
        "excludeFromStats null",
        { ...valid, excludeFromStats: null },
        "excludeFromStats"
      ]
    ];

    it.each(cases)("AC-6 API-TLOG-002: %s → 400", async (_, body, field) => {
      const response = await as(a).post("/time-logs", body);

      expect(response.status).toBe(400);
      expect(response.body.type).toBe(errorType("validation"));
      expect(fieldsOf(response.body)).toContain(field);
    });

    it("AC-6 API-TLOG-002: nothing was created by the rejected requests", async () => {
      expect((await getDay(a, TODAY)).logs).toEqual([]);
      expect((await getDay(a, TOMORROW)).logs).toEqual([]);
    });
  });

  it("AC-7 API-TLOG-002: duration bounds, title trimming and excludeFromStats, which still counts in the day total", async () => {
    const a = await insertUser();

    expect((await createLog(a, { durationMinutes: 15 })).durationMinutes).toBe(
      15
    );
    expect(
      (await createLog(a, { durationMinutes: 1440 })).durationMinutes
    ).toBe(1440);
    expect((await createLog(a, { title: "   " })).title).toBeNull();
    expect((await createLog(a, { title: " Review " })).title).toBe("Review");

    const excluded = await createLog(a, {
      durationMinutes: 45,
      excludeFromStats: true
    });
    expect(excluded.excludeFromStats).toBe(true);

    const day = await getDay(a, TODAY);
    expect(day.totalMinutes).toBe(15 + 1440 + 30 + 30 + 45);
    expect(day.logs.find((l) => l.id === excluded.id)?.excludeFromStats).toBe(
      true
    );
  });

  it("AC-8 API-TLOG-002: a task links its project; a matching projectId is accepted, a different one → 400", async () => {
    const { a, p, q, t } = await seedA();

    const withTask = await createLog(a, { taskId: t.id });
    expect(withTask.task).toEqual(ref(t));
    expect(withTask.project).toEqual(ref(p));

    const matching = await as(a).post("/time-logs", {
      workDate: TODAY,
      durationMinutes: 15,
      text: "Work",
      taskId: t.id,
      projectId: p.id
    });
    expect(matching.status).toBe(201);
    expect(matching.body.project).toEqual(ref(p));
    expect(matching.body.task).toEqual(ref(t));

    const differing = await as(a).post("/time-logs", {
      workDate: TODAY,
      durationMinutes: 15,
      text: "Work",
      taskId: t.id,
      projectId: q.id
    });
    expect(differing.status).toBe(400);
    expect(fieldsOf(differing.body)).toContain("projectId");
    expect((await getDay(a, TODAY)).logs).toHaveLength(2);
  });

  describe("AC-9 API-TLOG-002: project-only links; unknown, foreign or trashed links → 404", () => {
    it("AC-9 API-TLOG-002: projectId only → project set, task null; a completed task → 201", async () => {
      const { a, p } = await seedA();
      const done = await insertTask(a.id, p.id, {
        title: "Shipped",
        status: "completed"
      });

      const projectOnly = await createLog(a, { projectId: p.id });
      expect(projectOnly.project).toEqual(ref(p));
      expect(projectOnly.task).toBeNull();

      const completed = await createLog(a, { taskId: done.id });
      expect(completed.task).toEqual(ref(done));
    });

    const cases: [
      string,
      (a: UserRow, b: UserRow) => Promise<object>,
      string
    ][] = [
      [
        "B's project",
        async (_a, b) => ({ projectId: (await insertProject(b.id)).id }),
        "Project not found."
      ],
      [
        "a random project id",
        () => Promise.resolve({ projectId: randomUUID() }),
        "Project not found."
      ],
      [
        "a trashed project",
        async (a) => ({
          projectId: (await insertProject(a.id, { deleted_at: new Date() })).id
        }),
        "Project not found."
      ],
      [
        "B's task",
        async (_a, b) => {
          const project = await insertProject(b.id);
          return { taskId: (await insertTask(b.id, project.id)).id };
        },
        "Task not found."
      ],
      [
        "a random task id",
        () => Promise.resolve({ taskId: randomUUID() }),
        "Task not found."
      ],
      [
        "a trashed task",
        async (a) => {
          const project = await insertProject(a.id);
          const task = await insertTask(a.id, project.id, {
            deleted_at: new Date()
          });
          return { taskId: task.id };
        },
        "Task not found."
      ],
      [
        "a task of a trashed project",
        async (a) => {
          const project = await insertProject(a.id, { deleted_at: new Date() });
          return { taskId: (await insertTask(a.id, project.id)).id };
        },
        "Task not found."
      ]
    ];

    it.each(cases)(
      "AC-9 API-TLOG-002: %s → 404 not-found, nothing created",
      async (_, link, detail) => {
        const a = await insertUser();
        const b = await insertUser();

        const response = await as(a).post("/time-logs", {
          workDate: TODAY,
          durationMinutes: 15,
          text: "Work",
          dayStartMinute: 540,
          ...(await link(a, b))
        });

        expect(response.status).toBe(404);
        expect(response.body).toMatchObject({
          type: errorType("not-found"),
          detail
        });
        expect(await getDay(a, TODAY)).toMatchObject({
          startMinute: null,
          logs: []
        });
      }
    );
  });

  describe("AC-10 API-WD-003: GET /workdays/{date}", () => {
    it("AC-10 API-WD-003: logs in the order created, totalMinutes their sum, no other user's logs", async () => {
      const a = await insertUser();
      const b = await insertUser();
      await createLog(b, { durationMinutes: 60, text: "B's work" });

      const first = await createLog(a, { durationMinutes: 15, text: "First" });
      const second = await createLog(a, {
        durationMinutes: 30,
        text: "Second"
      });
      const third = await createLog(a, { durationMinutes: 45, text: "Third" });

      const day = await getDay(a, TODAY);
      expect(day.logs.map((l) => l.id)).toEqual([
        first.id,
        second.id,
        third.id
      ]);
      expect(day.totalMinutes).toBe(90);
      expect(day.logs.map((l) => l.text)).not.toContain("B's work");
    });

    it("AC-10 API-WD-003: a date with nothing → empty day; any real date is valid", async () => {
      const a = await insertUser();

      for (const date of ["2026-09-01", TOMORROW]) {
        expect(await getDay(a, date)).toEqual({
          workDate: date,
          startMinute: null,
          totalMinutes: 0,
          logs: []
        });
      }
    });

    it("AC-10 API-WD-003: 2026-13-01 → 400", async () => {
      const a = await insertUser();

      const response = await as(a).get("/workdays/2026-13-01");

      expect(response.status).toBe(400);
      expect(response.body.type).toBe(errorType("validation"));
    });
  });

  it("AC-11 API-WD-002: PUT sets the day start; a future date or a start off the 15-minute grid → 400", async () => {
    const a = await insertUser();

    const set = await as(a).put(`/workdays/${TODAY}`, { startMinute: 480 });
    expect(set.status).toBe(200);
    expect(set.body).toEqual({ workDate: TODAY, startMinute: 480 });
    expect((await getDay(a, TODAY)).startMinute).toBe(480);

    const replaced = await as(a).put(`/workdays/${TODAY}`, {
      startMinute: 525
    });
    expect(replaced.status).toBe(200);
    expect((await getDay(a, TODAY)).startMinute).toBe(525);

    const future = await as(a).put(`/workdays/${TOMORROW}`, {
      startMinute: 480
    });
    expect(future.status).toBe(400);

    const offGrid = await as(a).put(`/workdays/${TODAY}`, { startMinute: 485 });
    expect(offGrid.status).toBe(400);
    expect(fieldsOf(offGrid.body)).toContain("startMinute");

    expect((await getDay(a, TODAY)).startMinute).toBe(525);
    expect((await getDay(a, TOMORROW)).startMinute).toBeNull();
  });

  describe("AC-12 API-WD-001: GET /workdays?from=&to=", () => {
    it("AC-12 API-WD-001: one item per workday in the range with its start and total", async () => {
      const a = await insertUser();
      const b = await insertUser();
      await createLog(a, { workDate: "2026-09-30", dayStartMinute: 420 });
      await createLog(a, {
        workDate: "2026-10-02",
        dayStartMinute: 480,
        durationMinutes: 30
      });
      await createLog(a, {
        workDate: "2026-10-05",
        dayStartMinute: 540,
        durationMinutes: 60
      });
      await createLog(a, { workDate: "2026-10-05", durationMinutes: 15 });
      const deleted = await createLog(a, {
        workDate: "2026-10-06",
        dayStartMinute: 600
      });
      expect((await as(a).delete(`/time-logs/${deleted.id}`)).status).toBe(204);
      expect(
        (await as(a).put(`/workdays/${TODAY}`, { startMinute: 450 })).status
      ).toBe(200);
      await createLog(b, { workDate: "2026-10-03" });

      const response = await as(a).get(
        "/workdays?from=2026-10-01&to=2026-10-31"
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        items: [
          { workDate: "2026-10-02", startMinute: 480, totalMinutes: 30 },
          { workDate: "2026-10-05", startMinute: 540, totalMinutes: 75 },
          { workDate: "2026-10-06", startMinute: 600, totalMinutes: 0 },
          { workDate: TODAY, startMinute: 450, totalMinutes: 0 }
        ]
      });
    });

    const invalid: [string, string][] = [
      ["a range over 366 days", "from=2025-01-01&to=2026-10-07"],
      ["from after to", "from=2026-10-07&to=2026-10-01"],
      ["no to", "from=2026-10-01"],
      ["an invalid from", "from=2026-02-30&to=2026-03-31"]
    ];

    it.each(invalid)("AC-12 API-WD-001: %s → 400", async (_, query) => {
      const a = await insertUser();

      const response = await as(a).get(`/workdays?${query}`);

      expect(response.status).toBe(400);
      expect(response.body.type).toBe(errorType("validation"));
    });
  });

  describe("AC-13 API-TLOG-004: PATCH the fields of a log", () => {
    it("AC-13 API-TLOG-004: changes duration, text, title (null clears) and excludeFromStats; {} → 200 unchanged", async () => {
      const a = await insertUser();
      const log = await createLog(a, {
        title: "Review",
        excludeFromStats: true
      });

      const changed = await as(a).patch(`/time-logs/${log.id}`, {
        durationMinutes: 90,
        text: " Pairing ",
        title: " Call "
      });
      expect(changed.status).toBe(200);
      expect(changed.body).toMatchObject({
        id: log.id,
        durationMinutes: 90,
        text: "Pairing",
        title: "Call",
        excludeFromStats: true
      });

      const cleared = await as(a).patch(`/time-logs/${log.id}`, {
        title: null,
        excludeFromStats: false
      });
      expect(cleared.status).toBe(200);
      expect(cleared.body).toMatchObject({
        title: null,
        excludeFromStats: false
      });

      const empty = await as(a).patch(`/time-logs/${log.id}`, {});
      expect(empty.status).toBe(200);
      expect(empty.body).toEqual({
        id: log.id,
        workDate: TODAY,
        durationMinutes: 90,
        text: "Pairing",
        title: null,
        project: null,
        task: null,
        excludeFromStats: false
      });
      expect((await getDay(a, TODAY)).logs).toEqual([empty.body]);
    });

    it.each(["text", "durationMinutes", "workDate", "excludeFromStats"])(
      "AC-13 API-TLOG-004: %s: null → 400",
      async (field) => {
        const a = await insertUser();
        const log = await createLog(a);

        const response = await as(a).patch(`/time-logs/${log.id}`, {
          [field]: null
        });

        expect(response.status).toBe(400);
        expect(fieldsOf(response.body)).toContain(field);
        expect((await getDay(a, TODAY)).logs).toEqual([log]);
      }
    );
  });

  it("AC-14 API-TLOG-004: the link is replaced as a unit when either field is present, else kept", async () => {
    const { a, p, q, t, u } = await seedA();
    const log = await createLog(a, { taskId: t.id });
    const patch = (body: object) => as(a).patch(`/time-logs/${log.id}`, body);

    const toU = await patch({ taskId: u.id });
    expect(toU.status).toBe(200);
    expect(toU.body).toMatchObject({ task: ref(u), project: ref(q) });

    const projectOnly = await patch({ projectId: p.id });
    expect(projectOnly.status).toBe(200);
    expect(projectOnly.body).toMatchObject({ task: null, project: ref(p) });

    const unlinked = await patch({ projectId: null });
    expect(unlinked.status).toBe(200);
    expect(unlinked.body).toMatchObject({ task: null, project: null });

    expect((await patch({ taskId: t.id })).status).toBe(200);
    const kept = await patch({ text: "Still linked" });
    expect(kept.status).toBe(200);
    expect(kept.body).toMatchObject({ task: ref(t), project: ref(p) });

    const b = await insertUser();
    const bProject = await insertProject(b.id);
    const bTask = await insertTask(b.id, bProject.id);
    const foreign = await patch({ taskId: bTask.id });
    expect(foreign.status).toBe(404);
    expect(foreign.body.type).toBe(errorType("not-found"));
    expect((await getDay(a, TODAY)).logs[0]).toMatchObject({
      task: ref(t),
      project: ref(p)
    });
  });

  it("AC-15 API-TLOG-004: moving a log to another date follows the day-start rules and keeps entry order", async () => {
    const a = await insertUser();
    const moved = await createLog(a, { workDate: TODAY, dayStartMinute: 540 });
    const other = await createLog(a, { workDate: TODAY });
    const later1 = await createLog(a, {
      workDate: "2026-10-06",
      dayStartMinute: 600
    });
    const later2 = await createLog(a, { workDate: "2026-10-06" });

    const noStart = await as(a).patch(`/time-logs/${moved.id}`, {
      workDate: "2026-10-05"
    });
    expect(noStart.status).toBe(400);
    expect(fieldsOf(noStart.body)).toContain("dayStartMinute");

    const withStart = await as(a).patch(`/time-logs/${moved.id}`, {
      workDate: "2026-10-05",
      dayStartMinute: 420
    });
    expect(withStart.status).toBe(200);
    expect(withStart.body.workDate).toBe("2026-10-05");
    expect(await getDay(a, "2026-10-05")).toMatchObject({
      startMinute: 420,
      logs: [{ id: moved.id }]
    });

    const future = await as(a).patch(`/time-logs/${moved.id}`, {
      workDate: TOMORROW,
      dayStartMinute: 420
    });
    expect(future.status).toBe(400);
    expect(fieldsOf(future.body)).toContain("workDate");

    const toExisting = await as(a).patch(`/time-logs/${moved.id}`, {
      workDate: "2026-10-06"
    });
    expect(toExisting.status).toBe(200);
    const day = await getDay(a, "2026-10-06");
    expect(day.startMinute).toBe(600);
    expect(day.logs.map((l) => l.id)).toEqual([moved.id, later1.id, later2.id]);
    expect((await getDay(a, TODAY)).logs.map((l) => l.id)).toEqual([other.id]);
  });

  it("AC-16 API-TLOG-004: a log keeps its link to a task trashed later; a different trashed task → 404", async () => {
    const { a, p, t } = await seedA();
    const log = await createLog(a, { taskId: t.id });
    const other = await insertTask(a.id, p.id, { title: "Old task" });
    await trashTask(t.id);
    await trashTask(other.id);

    const text = await as(a).patch(`/time-logs/${log.id}`, { text: "x" });
    expect(text.status).toBe(200);

    const same = await as(a).patch(`/time-logs/${log.id}`, { taskId: t.id });
    expect(same.status).toBe(200);

    expect((await getDay(a, TODAY)).logs[0]).toMatchObject({
      text: "x",
      task: ref(t, true),
      project: ref(p)
    });

    const different = await as(a).patch(`/time-logs/${log.id}`, {
      taskId: other.id
    });
    expect(different.status).toBe(404);
    expect(different.body.type).toBe(errorType("not-found"));
  });

  it("AC-17 API-TLOG-006: DELETE removes the log and keeps the workday; again, foreign or malformed ids → 404", async () => {
    const a = await insertUser();
    const b = await insertUser();
    const log = await createLog(a);
    const bLog = await createLog(b);

    const removed = await as(a).delete(`/time-logs/${log.id}`);
    expect(removed.status).toBe(204);
    expect(await getDay(a, TODAY)).toEqual({
      workDate: TODAY,
      startMinute: 540,
      totalMinutes: 0,
      logs: []
    });

    for (const id of [log.id, bLog.id, "abc"]) {
      const response = await as(a).delete(`/time-logs/${id}`);
      expect(response.status, id).toBe(404);
      expect(response.body.type).toBe(errorType("not-found"));
    }
    for (const id of [bLog.id, "abc", randomUUID()]) {
      const response = await as(a).patch(`/time-logs/${id}`, { text: "x" });
      expect(response.status, id).toBe(404);
      expect(response.body.type).toBe(errorType("not-found"));
    }
    expect((await getDay(b, TODAY)).logs).toEqual([bLog]);
  });

  it("AC-18 API-TSK-004: moving a task to another project moves its logs; a project-only log stays", async () => {
    const { a, p, q, t } = await seedA();
    const taskLog = await createLog(a, { taskId: t.id });
    const projectLog = await createLog(a, { projectId: p.id });

    const moved = await as(a).patch(`/tasks/${t.id}`, { projectId: q.id });
    expect(moved.status).toBe(200);

    const logs = (await getDay(a, TODAY)).logs;
    expect(logs.find((l) => l.id === taskLog.id)).toMatchObject({
      task: ref(t),
      project: ref(q)
    });
    expect(logs.find((l) => l.id === projectLog.id)).toMatchObject({
      task: null,
      project: ref(p)
    });
  });

  it("AC-19 API-WD-003: logs of trashed projects and tasks stay in their day with deleted: true and count", async () => {
    const a = await insertUser();
    const p2 = await insertProject(a.id, { title: "Trashed project" });
    const p3 = await insertProject(a.id, { title: "Live project" });
    const t3 = await insertTask(a.id, p3.id, { title: "Trashed task" });
    const p4 = await insertProject(a.id, { title: "Project trashed later" });
    const t4 = await insertTask(a.id, p4.id, {
      title: "Task in a trashed project"
    });

    const byProject = await createLog(a, {
      projectId: p2.id,
      durationMinutes: 15
    });
    const byTask = await createLog(a, { taskId: t3.id, durationMinutes: 30 });
    const byProjectTask = await createLog(a, {
      taskId: t4.id,
      durationMinutes: 45
    });
    await trashProject(p2.id);
    await trashTask(t3.id);
    await trashProject(p4.id);

    const day = await getDay(a, TODAY);
    const find = (id: string) => day.logs.find((l) => l.id === id);
    expect(find(byProject.id)).toMatchObject({
      project: ref(p2, true),
      task: null
    });
    expect(find(byTask.id)).toMatchObject({
      project: ref(p3),
      task: ref(t3, true)
    });
    expect(find(byProjectTask.id)).toMatchObject({
      project: ref(p4, true),
      task: ref(t4, true)
    });
    expect(day.totalMinutes).toBe(90);
  });

  describe("AC-20 API-WD-*, API-TLOG-*: every endpoint needs a token", () => {
    const id = randomUUID();
    type Method = "get" | "put" | "post" | "patch" | "delete";
    const cases: [Method, string, object | undefined][] = [
      ["get", "/workdays?from=2026-10-01&to=2026-10-31", undefined],
      ["get", `/workdays/${TODAY}`, undefined],
      ["put", `/workdays/${TODAY}`, { startMinute: 480 }],
      [
        "post",
        "/time-logs",
        { workDate: TODAY, durationMinutes: 15, text: "x", dayStartMinute: 540 }
      ],
      ["patch", `/time-logs/${id}`, { text: "x" }],
      ["delete", `/time-logs/${id}`, undefined]
    ];

    it.each(cases)(
      "AC-20 API-WD-*, API-TLOG-*: %s %s without a token → 401",
      async (method, url, body) => {
        const server = request(app.getHttpServer());
        const req = server[method](`/api/v1${url}`);

        const response = await (body ? req.send(body) : req);

        expect(response.status).toBe(401);
        expect(response.body).toMatchObject({
          type: errorType("unauthorized")
        });
      }
    );
  });
});
