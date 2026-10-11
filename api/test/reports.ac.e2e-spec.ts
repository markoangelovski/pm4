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
import { insertProject, insertTask } from "./support/project-test-utils.js";

const errorType = (slug: string) => `${process.env.WEB_APP_URL}/errors/${slug}`;

/** Noon in Zagreb on 2026-10-09: "today" for a user in `Europe/Zagreb`. */
const NOW = new Date("2026-10-09T10:00:00.000Z");

interface RefBody {
  id: string | null;
  title: string;
  deleted: boolean;
}

interface ReportDayBody {
  workDate: string;
  startMinute: number | null;
  workedMinutes: number;
  bookedMinutes: number;
}

interface ReportProjectBody {
  kind: "project" | "unsorted" | "nonprod";
  project: RefBody | null;
  workedMinutes: number;
  bookedMinutes: number;
}

/** Any response body these tests read: a log, the report or a Problem. */
interface Body {
  id: string;
  days: ReportDayBody[];
  projects: ReportProjectBody[];
  items: unknown[];
  type: string;
}

interface Res {
  status: number;
  body: Body;
}

async function send(req: request.Test): Promise<Res> {
  const response = await req;
  return { status: response.status, body: response.body as Body };
}

describe("Dashboard report API (feat-rpt-api)", () => {
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
        )
    };
  };

  const setDayStart = async (
    user: UserRow,
    date: string,
    startMinute: number
  ) => {
    const response = await as(user).put(`/workdays/${date}`, { startMinute });
    expect(response.status, JSON.stringify(response.body)).toBe(200);
  };

  /** Creates a log for `user` (day start 09:00 if the day has none) and returns its id. */
  const createLog = async (
    user: UserRow,
    fields: Record<string, unknown>
  ): Promise<string> => {
    const response = await as(user).post("/time-logs", {
      text: "Work",
      dayStartMinute: 540,
      ...fields
    });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    return response.body.id;
  };

  const book = async (user: UserRow, logIds: string[], bookingDate: string) => {
    const response = await as(user).put("/bookings", { logIds, bookingDate });
    expect(response.status, JSON.stringify(response.body)).toBe(200);
  };

  const report = async (user: UserRow, from: string, to: string) => {
    const response = await as(user).get(
      `/reports/dashboard?from=${from}&to=${to}`
    );
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    return { days: response.body.days, projects: response.body.projects };
  };

  const day = (
    workDate: string,
    startMinute: number | null,
    workedMinutes: number,
    bookedMinutes: number
  ): ReportDayBody => ({ workDate, startMinute, workedMinutes, bookedMinutes });

  const projectRow = (
    project: RefBody,
    workedMinutes: number,
    bookedMinutes: number
  ): ReportProjectBody => ({
    kind: "project",
    project,
    workedMinutes,
    bookedMinutes
  });

  const ref = (p: { id: string; title: string }): RefBody => ({
    id: p.id,
    title: p.title,
    deleted: false
  });

  /** A's days in 1–9 Oct (AC-1). */
  const octoberDays = [
    day("2026-10-01", 480, 0, 0),
    day("2026-10-06", 510, 315, 120),
    day("2026-10-07", 555, 375, 240)
  ];

  /**
   * A user (Zagreb) with Anthropic (Meetings), Nvidia (Development, PM) and PM Internal,
   * the workdays 30 Sep 09:00, 1 Oct 08:00, 6 Oct 08:30, 7 Oct 09:15 and logs a…h.
   */
  const seed = async () => {
    const user = await insertUser({ time_zone: "Europe/Zagreb" });
    const anthropic = await insertProject(user.id, { title: "Anthropic" });
    const nvidia = await insertProject(user.id, { title: "Nvidia" });
    const internal = await insertProject(user.id, { title: "PM Internal" });
    const meetings = await insertTask(user.id, anthropic.id, { title: "Meetings" });
    const development = await insertTask(user.id, nvidia.id, {
      title: "Development"
    });
    const pm = await insertTask(user.id, nvidia.id, { title: "PM" });

    await setDayStart(user, "2026-09-30", 540);
    await setDayStart(user, "2026-10-01", 480);
    await setDayStart(user, "2026-10-06", 510);
    await setDayStart(user, "2026-10-07", 555);

    const a = await createLog(user, {
      workDate: "2026-10-06",
      durationMinutes: 120,
      taskId: meetings.id
    });
    const b = await createLog(user, {
      workDate: "2026-10-06",
      durationMinutes: 60,
      projectId: internal.id
    });
    const c = await createLog(user, {
      workDate: "2026-10-06",
      durationMinutes: 45
    });
    const d = await createLog(user, {
      workDate: "2026-10-06",
      durationMinutes: 90,
      projectId: anthropic.id,
      excludeFromStats: true
    });
    const e = await createLog(user, {
      workDate: "2026-10-07",
      durationMinutes: 240,
      taskId: development.id
    });
    const f = await createLog(user, {
      workDate: "2026-10-07",
      durationMinutes: 135,
      taskId: meetings.id
    });
    const g = await createLog(user, {
      workDate: "2026-09-30",
      durationMinutes: 60,
      taskId: pm.id
    });
    const h = await createLog(user, {
      workDate: "2026-09-30",
      durationMinutes: 30,
      taskId: pm.id
    });

    await book(user, [a, e], "2026-10-07");
    await book(user, [g], "2026-10-01");

    return {
      user,
      projects: { anthropic, nvidia, internal },
      logs: { a, b, c, d, e, f, g, h }
    };
  };

  it("AC-1 FR-RPT-003: days in 1–9 Oct carry the start time and the worked and booked minutes; a log booked into the range adds nothing to its booking date", async () => {
    const { user } = await seed();

    const { days } = await report(user, "2026-10-01", "2026-10-09");

    expect(days).toEqual(octoberDays);
  });

  it("AC-2 FR-RPT-006: projects in 1–9 Oct by worked minutes, then unsorted, then nonprod (an excluded log counts there although it has a project)", async () => {
    const { user, projects } = await seed();

    const result = await report(user, "2026-10-01", "2026-10-09");

    expect(result.projects).toEqual([
      projectRow(ref(projects.anthropic), 255, 120),
      projectRow(ref(projects.nvidia), 240, 240),
      projectRow(ref(projects.internal), 60, 0),
      { kind: "unsorted", project: null, workedMinutes: 45, bookedMinutes: 0 },
      { kind: "nonprod", project: null, workedMinutes: 90, bookedMinutes: 0 }
    ]);
  });

  it("AC-3 API-RPT-001: a one-day range (30 Sep) → that day and its one project", async () => {
    const { user, projects } = await seed();

    expect(await report(user, "2026-09-30", "2026-09-30")).toEqual({
      days: [day("2026-09-30", 540, 90, 60)],
      projects: [projectRow(ref(projects.nvidia), 90, 60)]
    });
  });

  it("AC-4 API-RPT-001: projects with the same worked minutes are ordered by title", async () => {
    const { user, projects } = await seed();
    const alpha = await insertProject(user.id, { title: "Alpha" });
    await createLog(user, {
      workDate: "2026-10-08",
      durationMinutes: 60,
      projectId: alpha.id
    });

    const result = await report(user, "2026-10-01", "2026-10-09");

    expect(
      result.projects.filter((p) => p.kind === "project").map((p) => p.project)
    ).toEqual([
      ref(projects.anthropic),
      ref(projects.nvidia),
      ref(alpha),
      ref(projects.internal)
    ]);
  });

  it("AC-5 API-RPT-001: a trashed project's row is marked deleted; purged projects group under their retained name", async () => {
    const { user, projects, logs } = await seed();
    await testDb().query(
      "UPDATE projects SET deleted_at = now() WHERE id = $1",
      [projects.internal.id]
    );

    const trashed = await report(user, "2026-10-01", "2026-10-09");
    expect(trashed.projects).toContainEqual(
      projectRow(
        { id: projects.internal.id, title: "PM Internal", deleted: true },
        60,
        0
      )
    );

    const other = await insertProject(user.id, { title: "Other" });
    const otherLog = await createLog(user, {
      workDate: "2026-10-07",
      durationMinutes: 30,
      projectId: other.id
    });
    await testDb().query(
      `UPDATE time_logs SET project_id = NULL, deleted_project_title = 'Old'
       WHERE id = ANY($1)`,
      [[logs.b, otherLog]]
    );

    const purged = await report(user, "2026-10-01", "2026-10-09");
    const projectRows = purged.projects.filter((p) => p.kind === "project");
    expect(projectRows).toContainEqual(
      projectRow({ id: null, title: "Old", deleted: true }, 90, 0)
    );
    expect(projectRows.filter((p) => p.project?.title === "Old")).toHaveLength(
      1
    );
    expect(projectRows.map((p) => p.project?.id)).not.toContain(
      projects.internal.id
    );
    expect(projectRows.map((p) => p.project?.id)).not.toContain(other.id);
  });

  it("AC-6 API-RPT-001: another user's logs and workdays never appear; a range with nothing → empty lists", async () => {
    const { user, projects } = await seed();
    const other = await insertUser({ time_zone: "Europe/Zagreb" });
    const otherProject = await insertProject(other.id, { title: "Anthropic" });
    await setDayStart(other, "2026-10-02", 420);
    await setDayStart(other, "2026-10-06", 600);
    const otherLog = await createLog(other, {
      workDate: "2026-10-06",
      durationMinutes: 300,
      projectId: otherProject.id
    });
    await createLog(other, { workDate: "2026-10-07", durationMinutes: 60 });
    await book(other, [otherLog], "2026-10-06");

    const result = await report(user, "2026-10-01", "2026-10-09");
    expect(result.days).toEqual(octoberDays);
    expect(result.projects).toEqual([
      projectRow(ref(projects.anthropic), 255, 120),
      projectRow(ref(projects.nvidia), 240, 240),
      projectRow(ref(projects.internal), 60, 0),
      { kind: "unsorted", project: null, workedMinutes: 45, bookedMinutes: 0 },
      { kind: "nonprod", project: null, workedMinutes: 90, bookedMinutes: 0 }
    ]);

    expect(await report(user, "2026-11-01", "2026-11-30")).toEqual({
      days: [],
      projects: []
    });
  });

  describe("AC-7 API-RPT-001: an invalid range → 400", () => {
    const invalid: [string, string][] = [
      ["from after to", "from=2026-10-09&to=2026-10-01"],
      ["367 days apart", "from=2025-10-07&to=2026-10-09"],
      ["an invalid from", "from=2026-02-30&to=2026-03-31"],
      ["no to", "from=2026-10-01"]
    ];

    it.each(invalid)("AC-7 API-RPT-001: %s → 400", async (_, query) => {
      const user = await insertUser();

      const response = await as(user).get(`/reports/dashboard?${query}`);

      expect(response.status).toBe(400);
      expect(response.body.type).toBe(errorType("validation"));
    });

    it("AC-7 API-RPT-001: 366 days apart → 200", async () => {
      const user = await insertUser();

      expect(await report(user, "2025-10-08", "2026-10-09")).toEqual({
        days: [],
        projects: []
      });
    });
  });

  it("AC-8 API-RPT-001: without a token → 401", async () => {
    const response = await request(app.getHttpServer()).get(
      "/api/v1/reports/dashboard?from=2026-10-01&to=2026-10-09"
    );

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ type: errorType("unauthorized") });
  });
});
