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
import { insertProject, insertTask } from "./support/project-test-utils.js";

/** Noon in Zagreb on 2026-10-09: "today" for a user in `Europe/Zagreb`. */
const NOW = new Date("2026-10-09T10:00:00.000Z");

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

interface BookingBody {
  date: string;
  minutes: number;
}

interface BookingLogBody extends TimeLogBody {
  bookings: BookingBody[];
}

interface ItemBody {
  id: string;
  loggedMinutes: number;
}

/** Any response body these tests read: a log list, a project or task (list), or a Problem. */
interface Body {
  id: string;
  loggedMinutes: number;
  items: (BookingLogBody & ItemBody)[];
  page: number;
  pageSize: number;
  total: number;
  totalMinutes: number;
  bookedMinutes: number;
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

describe("Logged time API (feat-proto-sync-web)", () => {
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
      post: (url: string, body: object) =>
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

  /** Creates a log for `user` (day start 09:00) and returns it. */
  const createLog = async (
    user: UserRow,
    fields: Record<string, unknown>
  ): Promise<TimeLogBody> => {
    const response = await as(user).post("/time-logs", {
      text: "Work",
      dayStartMinute: 540,
      ...fields
    });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    return response.body as unknown as TimeLogBody;
  };

  const withBooking = (log: TimeLogBody, bookings: BookingBody[]) => ({
    ...log,
    bookings
  });

  /** The direct log's booking. */
  const BOOKED = [{ date: "2026-10-07", minutes: 60 }];

  const byId = (x: { id: string }, y: { id: string }) =>
    x.id < y.id ? -1 : x.id > y.id ? 1 : 0;

  /** The `loggedMinutes` of `id` in a list body. */
  const loggedIn = (body: Body, id: string) => {
    const item = body.items.find((i) => i.id === id);
    expect(item, id).toBeDefined();
    return item!.loggedMinutes;
  };

  /**
   * User A (Zagreb) with project P (tasks T1, T2) and project Q. Logs on P: 60 min direct, booked;
   * 30 min on T1, unbooked; 15 min on T2, excluded from statistics. User B logs 45 min on B's own project.
   */
  const seed = async () => {
    const a = await insertUser({ time_zone: "Europe/Zagreb" });
    const b = await insertUser({ time_zone: "Europe/Zagreb" });
    const p = await insertProject(a.id, { title: "Anthropic" });
    const q = await insertProject(a.id, { title: "Nvidia" });
    const t1 = await insertTask(a.id, p.id, { title: "Meetings" });
    const t2 = await insertTask(a.id, p.id, { title: "QA" });
    const bProject = await insertProject(b.id, { title: "Tesla" });

    const direct = await createLog(a, {
      workDate: "2026-10-06",
      durationMinutes: 60,
      projectId: p.id
    });
    const onT1 = await createLog(a, {
      workDate: "2026-10-07",
      durationMinutes: 30,
      taskId: t1.id
    });
    const onT2 = await createLog(a, {
      workDate: "2026-10-06",
      durationMinutes: 15,
      taskId: t2.id,
      excludeFromStats: true
    });
    const booked = await as(a).put("/bookings", {
      logs: [
        { logId: direct.id, bookings: [{ date: "2026-10-07", minutes: 60 }] }
      ]
    });
    expect(booked.status, JSON.stringify(booked.body)).toBe(200);

    const bLog = await createLog(b, {
      workDate: "2026-10-06",
      durationMinutes: 45,
      projectId: bProject.id
    });

    return {
      a,
      b,
      projects: { p, q, bProject },
      tasks: { t1, t2 },
      logs: { direct, onT1, onT2, bLog }
    };
  };

  it("AC-1 API-TLOG-001: ?projectId → the project's logs (its tasks' too) as BookingLogs, workDate desc then id asc, with the totals", async () => {
    const { a, projects, logs } = await seed();
    const { direct, onT1, onT2 } = logs;

    const response = await as(a).get(`/time-logs?projectId=${projects.p.id}`);

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body).toEqual({
      items: [
        withBooking(onT1, []),
        ...[withBooking(direct, BOOKED), withBooking(onT2, [])].sort(byId)
      ],
      page: 1,
      pageSize: 25,
      total: 3,
      totalMinutes: 105,
      bookedMinutes: 60
    });
  });

  it("AC-2 API-TLOG-001: ?taskId → only the task's logs and their totals", async () => {
    const { a, tasks, logs } = await seed();

    const response = await as(a).get(`/time-logs?taskId=${tasks.t1.id}`);

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body).toEqual({
      items: [withBooking(logs.onT1, [])],
      page: 1,
      pageSize: 25,
      total: 1,
      totalMinutes: 30,
      bookedMinutes: 0
    });
  });

  it("AC-3 API-TLOG-001: page and pageSize page the items; the totals cover every log, also past the end", async () => {
    const { a, projects, logs } = await seed();
    const [, last] = [logs.direct, logs.onT2].sort(byId);
    const url = `/time-logs?projectId=${projects.p.id}&pageSize=2`;

    const second = await as(a).get(`${url}&page=2`);
    expect(second.status, JSON.stringify(second.body)).toBe(200);
    expect(second.body).toEqual({
      items: [withBooking(last, last.id === logs.direct.id ? BOOKED : [])],
      page: 2,
      pageSize: 2,
      total: 3,
      totalMinutes: 105,
      bookedMinutes: 60
    });

    const past = await as(a).get(`${url}&page=3`);
    expect(past.status, JSON.stringify(past.body)).toBe(200);
    expect(past.body).toEqual({
      items: [],
      page: 3,
      pageSize: 2,
      total: 3,
      totalMinutes: 105,
      bookedMinutes: 60
    });
  });

  it("AC-4 API-TLOG-001: both ids or neither → 400 on projectId; a non-UUID id, pageSize 101 or q → 400", async () => {
    const { a, projects, tasks } = await seed();
    const { p } = projects;

    for (const query of [`?projectId=${p.id}&taskId=${tasks.t1.id}`, ""]) {
      const response = await as(a).get(`/time-logs${query}`);
      expect(response.status, query).toBe(400);
      expect(fieldsOf(response.body), query).toEqual(["projectId"]);
    }

    for (const query of [
      "?projectId=not-a-uuid",
      "?taskId=not-a-uuid",
      `?projectId=${p.id}&pageSize=101`,
      `?projectId=${p.id}&q=x`
    ]) {
      const response = await as(a).get(`/time-logs${query}`);
      expect(response.status, query).toBe(400);
    }
  });

  it("AC-5 API-TLOG-001: another user's or an unknown id → an empty page with zero totals; no token → 401", async () => {
    const { a, projects } = await seed();
    const empty = {
      items: [],
      page: 1,
      pageSize: 25,
      total: 0,
      totalMinutes: 0,
      bookedMinutes: 0
    };

    for (const query of [
      `?projectId=${projects.bProject.id}`,
      `?projectId=${randomUUID()}`,
      `?taskId=${randomUUID()}`
    ]) {
      const response = await as(a).get(`/time-logs${query}`);
      expect(response.status, query).toBe(200);
      expect(response.body, query).toEqual(empty);
    }

    const anonymous = await request(app.getHttpServer()).get(
      `/api/v1/time-logs?projectId=${projects.p.id}`
    );
    expect(anonymous.status).toBe(401);
  });

  it("AC-6 API-PRJ-002/003: a project's loggedMinutes sums all its logs (its tasks', excluded and deleted ones too), only the caller's", async () => {
    const { a, b, projects, tasks } = await seed();
    const { p, q, bProject } = projects;

    const list = await as(a).get("/projects");
    expect(list.status).toBe(200);
    expect(loggedIn(list.body, p.id)).toBe(105);
    expect(loggedIn(list.body, q.id)).toBe(0);

    const detail = await as(a).get(`/projects/${p.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.loggedMinutes).toBe(105);

    expect((await as(a).delete(`/tasks/${tasks.t1.id}`)).status).toBe(204);
    expect((await as(a).get(`/projects/${p.id}`)).body.loggedMinutes).toBe(105);

    const created = await as(a).post("/projects", { title: "Google" });
    expect(created.status).toBe(201);
    expect(created.body.loggedMinutes).toBe(0);

    expect(
      (await as(b).get(`/projects/${bProject.id}`)).body.loggedMinutes
    ).toBe(45);
  });

  it("AC-7 API-TSK-002/003: a task's loggedMinutes sums its logs; moving the task moves its minutes to the new project", async () => {
    const { a, projects, tasks } = await seed();
    const { p, q } = projects;
    const { t1, t2 } = tasks;

    const list = await as(a).get(`/tasks?projectId=${p.id}`);
    expect(list.status).toBe(200);
    expect(loggedIn(list.body, t1.id)).toBe(30);
    expect(loggedIn(list.body, t2.id)).toBe(15);

    const detail = await as(a).get(`/tasks/${t1.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.loggedMinutes).toBe(30);

    const moved = await as(a).patch(`/tasks/${t1.id}`, { projectId: q.id });
    expect(moved.status, JSON.stringify(moved.body)).toBe(200);
    expect(moved.body.loggedMinutes).toBe(30);
    expect((await as(a).get(`/projects/${p.id}`)).body.loggedMinutes).toBe(75);
    expect((await as(a).get(`/projects/${q.id}`)).body.loggedMinutes).toBe(30);
  });
});
