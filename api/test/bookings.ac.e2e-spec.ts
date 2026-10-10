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

const errorType = (slug: string) => `${process.env.WEB_APP_URL}/errors/${slug}`;

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

interface BookingLogBody extends TimeLogBody {
  bookingDate: string | null;
}

/** Any response body these tests read: a log, a day, a booking list or a Problem. */
interface Body extends TimeLogBody {
  logs: TimeLogBody[];
  items: BookingLogBody[];
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

describe("Bookings API (feat-book-api)", () => {
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
    return response.body;
  };

  const book = async (
    user: UserRow,
    logIds: string[],
    bookingDate: string | null
  ): Promise<BookingLogBody[]> => {
    const response = await as(user).put("/bookings", { logIds, bookingDate });
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    return response.body.items;
  };

  const listBookings = async (
    user: UserRow,
    from: string,
    to: string
  ): Promise<BookingLogBody[]> => {
    const response = await as(user).get(`/bookings?from=${from}&to=${to}`);
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    return response.body.items;
  };

  /** The booking date of log `id` as `GET /bookings` lists it (Sep–Oct 2026). */
  const bookingDateOf = async (user: UserRow, id: string) => {
    const items = await listBookings(user, "2026-09-01", "2026-10-09");
    const item = items.find((i) => i.id === id);
    expect(item, id).toBeDefined();
    return item!.bookingDate;
  };

  const withBooking = (log: TimeLogBody, bookingDate: string | null) => ({
    ...log,
    bookingDate
  });

  const byId = (x: { id: string }, y: { id: string }) =>
    x.id < y.id ? -1 : x.id > y.id ? 1 : 0;

  /** User A (Zagreb) with Anthropic (Meetings), Nvidia (Development, PM), PM Internal and logs a…h. */
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

    await book(user, [a.id, e.id], "2026-10-07");
    await book(user, [g.id], "2026-10-01");

    return {
      user,
      projects: { anthropic, nvidia, internal },
      tasks: { meetings, development, pm },
      logs: { a, b, c, d, e, f, g, h }
    };
  };

  it("AC-1 API-BOOK-001: a range lists the logs worked or booked in it, by work date then entry order, each with its bookingDate", async () => {
    const { user, logs } = await seed();
    const { a, b, c, d, e, f, g } = logs;

    const response = await as(user).get(
      "/bookings?from=2026-10-01&to=2026-10-09"
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      items: [
        withBooking(g, "2026-10-01"),
        withBooking(a, "2026-10-07"),
        withBooking(b, null),
        withBooking(c, null),
        withBooking(d, null),
        withBooking(e, "2026-10-07"),
        withBooking(f, null)
      ]
    });
  });

  it("AC-2 API-BOOK-001: a log booked outside the range is listed by its work date; other users' logs never appear; an empty range → []", async () => {
    const { user, logs } = await seed();
    const other = await insertUser();
    const otherProject = await insertProject(other.id, { title: "Anthropic" });
    const otherLog = await createLog(other, {
      workDate: "2026-09-15",
      durationMinutes: 60,
      projectId: otherProject.id
    });
    await book(other, [otherLog.id], "2026-09-16");

    expect(await listBookings(user, "2026-09-01", "2026-09-30")).toEqual([
      withBooking(logs.g, "2026-10-01"),
      withBooking(logs.h, null)
    ]);
    expect(await listBookings(user, "2026-08-01", "2026-08-31")).toEqual([]);
  });

  describe("AC-3 API-BOOK-001: an invalid range → 400", () => {
    const invalid: [string, string][] = [
      ["from after to", "from=2026-10-09&to=2026-10-01"],
      ["a range over 366 days", "from=2025-01-01&to=2026-10-09"],
      ["an invalid from", "from=2026-02-30&to=2026-03-31"],
      ["no to", "from=2026-10-01"]
    ];

    it.each(invalid)("AC-3 API-BOOK-001: %s → 400", async (_, query) => {
      const user = await insertUser();

      const response = await as(user).get(`/bookings?${query}`);

      expect(response.status).toBe(400);
      expect(response.body.type).toBe(errorType("validation"));
    });
  });

  it("AC-4 API-BOOK-002: PUT books one log → 200 with the log and its bookingDate; GET shows it", async () => {
    const { user, logs } = await seed();

    const response = await as(user).put("/bookings", {
      logIds: [logs.b.id],
      bookingDate: "2026-10-06"
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      items: [withBooking(logs.b, "2026-10-06")]
    });
    expect(await bookingDateOf(user, logs.b.id)).toBe("2026-10-06");
  });

  it("AC-5 API-BOOK-002: repeated ids → each log once, in id order", async () => {
    const { user, logs } = await seed();
    const { b, f } = logs;

    const items = await book(user, [f.id, b.id, f.id], "2026-10-07");

    expect(items).toEqual(
      [withBooking(b, "2026-10-07"), withBooking(f, "2026-10-07")].sort(byId)
    );
  });

  it("AC-6 API-BOOK-002: bookingDate null unbooks; a booking date before the work date is allowed", async () => {
    const { user, logs } = await seed();

    expect(await book(user, [logs.a.id], null)).toEqual([
      withBooking(logs.a, null)
    ]);
    expect(await bookingDateOf(user, logs.a.id)).toBeNull();

    expect(await book(user, [logs.a.id], "2026-09-01")).toEqual([
      withBooking(logs.a, "2026-09-01")
    ]);
  });

  describe("AC-7 API-BOOK-002: invalid bodies → 400 naming the field", () => {
    let user: UserRow;
    let logId: string;

    beforeAll(async () => {
      const seeded = await seed();
      user = seeded.user;
      logId = seeded.logs.b.id;
    });

    const cases: [string, () => object, string][] = [
      [
        "a future bookingDate",
        () => ({ logIds: [logId], bookingDate: "2026-10-10" }),
        "bookingDate"
      ],
      [
        "bookingDate 2026-02-30",
        () => ({ logIds: [logId], bookingDate: "2026-02-30" }),
        "bookingDate"
      ],
      [
        "bookingDate 7.10.2026",
        () => ({ logIds: [logId], bookingDate: "7.10.2026" }),
        "bookingDate"
      ],
      ["no bookingDate", () => ({ logIds: [logId] }), "bookingDate"],
      [
        "logIds []",
        () => ({ logIds: [], bookingDate: "2026-10-06" }),
        "logIds"
      ],
      [
        "101 logIds",
        () => ({
          logIds: Array.from({ length: 101 }, () => randomUUID()),
          bookingDate: "2026-10-06"
        }),
        "logIds"
      ],
      [
        'logIds ["abc"]',
        () => ({ logIds: ["abc"], bookingDate: "2026-10-06" }),
        "logIds"
      ],
      ["no logIds", () => ({ bookingDate: "2026-10-06" }), "logIds"]
    ];

    it.each(cases)("AC-7 API-BOOK-002: %s → 400", async (_, body, field) => {
      const response = await as(user).put("/bookings", body());

      expect(response.status).toBe(400);
      expect(response.body.type).toBe(errorType("validation"));
      expect(fieldsOf(response.body)).toContain(field);
    });

    it("AC-7 API-BOOK-002: the rejected requests changed nothing", async () => {
      expect(await bookingDateOf(user, logId)).toBeNull();
    });
  });

  it("AC-8 API-BOOK-002: booking an unsorted or excluded log → 400 naming logIds, nothing changes; unbooking them → 200", async () => {
    const { user, logs } = await seed();
    const { b, c, d } = logs;

    for (const unbookable of [c, d]) {
      const response = await as(user).put("/bookings", {
        logIds: [b.id, unbookable.id],
        bookingDate: "2026-10-06"
      });
      expect(response.status, unbookable.text).toBe(400);
      expect(fieldsOf(response.body)).toContain("logIds");
      expect(await bookingDateOf(user, b.id)).toBeNull();
    }

    expect(await book(user, [c.id, d.id], null)).toEqual(
      [withBooking(c, null), withBooking(d, null)].sort(byId)
    );
  });

  it("AC-9 API-BOOK-002: another user's log or an unknown id among the ids → 404, and nothing changes", async () => {
    const { user, logs } = await seed();
    const other = await insertUser();
    const otherProject = await insertProject(other.id, { title: "Anthropic" });
    const otherLog = await createLog(other, {
      workDate: "2026-10-06",
      durationMinutes: 60,
      projectId: otherProject.id
    });

    for (const foreign of [otherLog.id, randomUUID()]) {
      const response = await as(user).put("/bookings", {
        logIds: [logs.b.id, logs.f.id, foreign],
        bookingDate: "2026-10-06"
      });
      expect(response.status, foreign).toBe(404);
      expect(response.body.type).toBe(errorType("not-found"));
    }
    expect(await bookingDateOf(user, logs.b.id)).toBeNull();
    expect(await bookingDateOf(user, logs.f.id)).toBeNull();
    expect(await bookingDateOf(other, otherLog.id)).toBeNull();
  });

  describe("AC-10 API-TLOG-004: edits that keep a log bookable keep its booking", () => {
    const edits: [string, (t: { pmId: string }) => object][] = [
      ["durationMinutes 180", () => ({ durationMinutes: 180 })],
      ["text", () => ({ text: "Refactoring" })],
      [
        "workDate 2026-10-05",
        () => ({ workDate: "2026-10-05", dayStartMinute: 540 })
      ],
      ["taskId of Nvidia/PM", ({ pmId }) => ({ taskId: pmId })]
    ];

    it.each(edits)(
      "AC-10 API-TLOG-004: PATCH %s → e stays booked to 2026-10-07",
      async (_, edit) => {
        const { user, logs, tasks } = await seed();

        const response = await as(user).patch(
          `/time-logs/${logs.e.id}`,
          edit({ pmId: tasks.pm.id })
        );

        expect(response.status, JSON.stringify(response.body)).toBe(200);
        expect(await bookingDateOf(user, logs.e.id)).toBe("2026-10-07");
      }
    );
  });

  it("AC-11 API-TLOG-004: excluding a log or removing its project clears its booking; another project keeps it", async () => {
    const { user, logs, projects } = await seed();

    const excluded = await as(user).patch(`/time-logs/${logs.e.id}`, {
      excludeFromStats: true
    });
    expect(excluded.status).toBe(200);
    expect(await bookingDateOf(user, logs.e.id)).toBeNull();

    const unlinked = await as(user).patch(`/time-logs/${logs.a.id}`, {
      projectId: null
    });
    expect(unlinked.status).toBe(200);
    expect(await bookingDateOf(user, logs.a.id)).toBeNull();

    const moved = await as(user).patch(`/time-logs/${logs.g.id}`, {
      projectId: projects.anthropic.id
    });
    expect(moved.status).toBe(200);
    expect(await bookingDateOf(user, logs.g.id)).toBe("2026-10-01");
  });

  it("AC-12 API-BOOK-001, API-TLOG-006: a deleted log leaves the bookings; the day's logs carry no bookingDate", async () => {
    const { user, logs } = await seed();

    expect((await as(user).delete(`/time-logs/${logs.a.id}`)).status).toBe(204);

    const items = await listBookings(user, "2026-10-01", "2026-10-09");
    expect(items.map((i) => i.id)).not.toContain(logs.a.id);

    const day = await as(user).get("/workdays/2026-10-06");
    expect(day.status).toBe(200);
    expect(day.body.logs).toHaveLength(3);
    for (const log of day.body.logs) {
      expect(log).not.toHaveProperty("bookingDate");
    }
  });

  describe("AC-13 API-BOOK-*: both endpoints need a token", () => {
    type Method = "get" | "put";
    const cases: [Method, string, object | undefined][] = [
      ["get", "/bookings?from=2026-10-01&to=2026-10-09", undefined],
      ["put", "/bookings", { logIds: [randomUUID()], bookingDate: null }]
    ];

    it.each(cases)(
      "AC-13 API-BOOK-*: %s %s without a token → 401",
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
