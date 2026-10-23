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

interface BookingBody {
  date: string;
  minutes: number;
}

interface BookingLogBody extends TimeLogBody {
  bookings: BookingBody[];
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

/** Any response body these tests read: a log, a day, a list, a report or a Problem. */
interface Body extends TimeLogBody {
  startMinute: number | null;
  logs: TimeLogBody[];
  items: BookingLogBody[];
  totalMinutes: number;
  bookedMinutes: number;
  days: ReportDayBody[];
  projects: ReportProjectBody[];
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

describe("Partial bookings API (feat-book-partial)", () => {
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

  const messageOf = (
    body: { errors?: { field: string; message: string }[] },
    field: string
  ) => body.errors?.find((e) => e.field === field)?.message;

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

  const setBookings = async (
    user: UserRow,
    logs: { logId: string; bookings: BookingBody[] }[]
  ): Promise<BookingLogBody[]> => {
    const response = await as(user).put("/bookings", { logs });
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

  /** Log `id` as `GET /bookings` lists it (Sep–Oct 2026). */
  const itemOf = async (user: UserRow, id: string) => {
    const items = await listBookings(user, "2026-09-01", "2026-10-09");
    const item = items.find((i) => i.id === id);
    expect(item, id).toBeDefined();
    return item!;
  };

  const bookingsOf = async (user: UserRow, id: string) =>
    (await itemOf(user, id)).bookings;

  /** The `bookings` rows of log `id`, straight from the database. */
  const bookingRowCount = async (id: string) => {
    const result = await testDb().query<{ count: string }>(
      "SELECT count(*) AS count FROM bookings WHERE time_log_id = $1",
      [id]
    );
    return Number(result.rows[0].count);
  };

  const withBookings = (log: TimeLogBody, bookings: BookingBody[]) => ({
    ...log,
    bookings
  });

  const byId = (x: { id: string }, y: { id: string }) =>
    x.id < y.id ? -1 : x.id > y.id ? 1 : 0;

  const OCT6_30 = { date: "2026-10-06", minutes: 30 };
  const OCT7_45 = { date: "2026-10-07", minutes: 45 };
  const OCT7_120 = { date: "2026-10-07", minutes: 120 };
  const OCT7_240 = { date: "2026-10-07", minutes: 240 };
  const OCT1_60 = { date: "2026-10-01", minutes: 60 };

  /**
   * User A (Zagreb) with Anthropic (Meetings), Nvidia (Development, PM), PM Internal and logs a…h:
   * a [7 Oct 120], e [7 Oct 240], f [6 Oct 30, 7 Oct 45], g [1 Oct 60]; b, c, d, h unbooked.
   */
  const seed = async () => {
    const user = await insertUser({ time_zone: "Europe/Zagreb" });
    const anthropic = await insertProject(user.id, { title: "Anthropic" });
    const nvidia = await insertProject(user.id, { title: "Nvidia" });
    const internal = await insertProject(user.id, { title: "PM Internal" });
    const meetings = await insertTask(user.id, anthropic.id, {
      title: "Meetings"
    });
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

    await setBookings(user, [
      { logId: a.id, bookings: [OCT7_120] },
      { logId: e.id, bookings: [OCT7_240] },
      { logId: f.id, bookings: [OCT6_30, OCT7_45] },
      { logId: g.id, bookings: [OCT1_60] }
    ]);

    return {
      user,
      projects: { anthropic, nvidia, internal },
      tasks: { meetings, development, pm },
      logs: { a, b, c, d, e, f, g, h }
    };
  };

  it("AC-1 API-BOOK-001: a range lists the logs worked or booked in it, each with all its bookings by date and no bookingDate; other users' logs never", async () => {
    const { user, logs } = await seed();
    const { a, b, c, d, e, f, g, h } = logs;
    const other = await insertUser({ time_zone: "Europe/Zagreb" });
    const otherProject = await insertProject(other.id, { title: "Anthropic" });
    const otherLog = await createLog(other, {
      workDate: "2026-09-15",
      durationMinutes: 60,
      projectId: otherProject.id
    });
    await setBookings(other, [
      { logId: otherLog.id, bookings: [{ date: "2026-10-06", minutes: 60 }] }
    ]);

    const response = await as(user).get(
      "/bookings?from=2026-10-01&to=2026-10-09"
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      items: [
        withBookings(g, [OCT1_60]),
        withBookings(a, [OCT7_120]),
        withBookings(b, []),
        withBookings(c, []),
        withBookings(d, []),
        withBookings(e, [OCT7_240]),
        withBookings(f, [OCT6_30, OCT7_45])
      ]
    });
    for (const item of response.body.items) {
      expect(item).not.toHaveProperty("bookingDate");
    }
    expect(await listBookings(user, "2026-09-01", "2026-09-30")).toEqual([
      withBookings(g, [OCT1_60]),
      withBookings(h, [])
    ]);
  });

  describe("AC-2 API-BOOK-001/002: an invalid range → 400; no token → 401", () => {
    const invalid: [string, string][] = [
      ["from after to", "from=2026-10-09&to=2026-10-01"],
      ["a range over 366 days", "from=2025-01-01&to=2026-10-09"],
      ["an invalid from", "from=2026-02-30&to=2026-03-31"],
      ["no to", "from=2026-10-01"]
    ];

    it.each(invalid)("AC-2 API-BOOK-001: %s → 400", async (_, query) => {
      const user = await insertUser();

      const response = await as(user).get(`/bookings?${query}`);

      expect(response.status).toBe(400);
      expect(response.body.type).toBe(errorType("validation"));
    });

    type Method = "get" | "put";
    const unauthorized: [Method, string, object | undefined][] = [
      ["get", "/bookings?from=2026-10-01&to=2026-10-09", undefined],
      ["put", "/bookings", { logs: [{ logId: randomUUID(), bookings: [] }] }]
    ];

    it.each(unauthorized)(
      "AC-2 API-BOOK-*: %s %s without a token → 401",
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

  it("AC-3 API-BOOK-002: PUT replaces each listed log's whole list → 200 with the logs in id order, bookings by date", async () => {
    const { user, logs } = await seed();
    const { a, b, f } = logs;

    const one = await as(user).put("/bookings", {
      logs: [{ logId: b.id, bookings: [OCT6_30] }]
    });
    expect(one.status, JSON.stringify(one.body)).toBe(200);
    expect(one.body).toEqual({ items: [withBookings(b, [OCT6_30])] });
    expect(await bookingsOf(user, b.id)).toEqual([OCT6_30]);

    const all = { date: "2026-10-07", minutes: 135 };
    expect(await setBookings(user, [{ logId: f.id, bookings: [all] }])).toEqual(
      [withBookings(f, [all])]
    );
    expect(await bookingsOf(user, f.id)).toEqual([all]);

    expect(await setBookings(user, [{ logId: a.id, bookings: [] }])).toEqual([
      withBookings(a, [])
    ]);
    expect(await bookingsOf(user, a.id)).toEqual([]);

    const beforeWork = { date: "2026-09-01", minutes: 120 };
    expect(
      await setBookings(user, [{ logId: a.id, bookings: [beforeWork] }])
    ).toEqual([withBookings(a, [beforeWork])]);

    const oct6 = { date: "2026-10-06", minutes: 15 };
    const oct7 = { date: "2026-10-07", minutes: 15 };
    expect(
      await setBookings(user, [{ logId: b.id, bookings: [oct7, oct6] }])
    ).toEqual([withBookings(b, [oct6, oct7])]);

    expect(
      await setBookings(user, [
        { logId: f.id, bookings: [OCT6_30, OCT7_45] },
        { logId: b.id, bookings: [] }
      ])
    ).toEqual(
      [withBookings(b, []), withBookings(f, [OCT6_30, OCT7_45])].sort(byId)
    );
  });

  describe("AC-4 API-BOOK-002: invalid bodies → 400 naming the field, and nothing changes", () => {
    let user: UserRow;
    let ids: { a: string; b: string; c: string; d: string };

    beforeAll(async () => {
      const seeded = await seed();
      user = seeded.user;
      const { a, b, c, d } = seeded.logs;
      ids = { a: a.id, b: b.id, c: c.id, d: d.id };
    });

    const booking = (date: string, minutes: number) => ({ date, minutes });
    /** b's valid new list, sent first where a later entry fails. */
    const validB = () => ({
      logId: ids.b,
      bookings: [booking("2026-10-06", 15)]
    });
    const oneBooking = (date: string, minutes: number) => ({
      logs: [{ logId: ids.b, bookings: [booking(date, minutes)] }]
    });

    const cases: [string, () => object, string, string?][] = [
      ["logs []", () => ({ logs: [] }), "logs"],
      [
        "101 entries",
        () => ({
          logs: Array.from({ length: 101 }, () => ({
            logId: randomUUID(),
            bookings: []
          }))
        }),
        "logs"
      ],
      ["no logs", () => ({}), "logs"],
      [
        'logId "abc"',
        () => ({ logs: [{ logId: "abc", bookings: [] }] }),
        "logs.0.logId"
      ],
      ["no bookings", () => ({ logs: [{ logId: ids.b }] }), "logs.0.bookings"],
      [
        "97 bookings",
        () => ({
          logs: [
            {
              logId: ids.b,
              bookings: Array.from({ length: 97 }, (_, i) =>
                booking(
                  `2026-0${1 + Math.floor(i / 28)}-${String(1 + (i % 28)).padStart(2, "0")}`,
                  15
                )
              )
            }
          ]
        }),
        "logs.0.bookings"
      ],
      [
        "date 2026-02-30",
        () => oneBooking("2026-02-30", 15),
        "logs.0.bookings.0.date"
      ],
      [
        "date 7.10.2026",
        () => oneBooking("7.10.2026", 15),
        "logs.0.bookings.0.date"
      ],
      [
        "date 2026-10-10 (tomorrow)",
        () => oneBooking("2026-10-10", 15),
        "logs.0.bookings.0.date",
        "must not be after today"
      ],
      [
        "minutes 0",
        () => oneBooking("2026-10-06", 0),
        "logs.0.bookings.0.minutes"
      ],
      [
        "minutes 20",
        () => oneBooking("2026-10-06", 20),
        "logs.0.bookings.0.minutes"
      ],
      [
        "minutes 1455",
        () => oneBooking("2026-10-06", 1455),
        "logs.0.bookings.0.minutes"
      ],
      [
        "a log listed twice",
        () => ({ logs: [validB(), { logId: ids.b, bookings: [] }] }),
        "logs.1.logId",
        "lists a log twice"
      ],
      [
        "two bookings on one date",
        () => ({
          logs: [
            {
              logId: ids.b,
              bookings: [booking("2026-10-06", 15), booking("2026-10-06", 15)]
            }
          ]
        }),
        "logs.0.bookings",
        "has two bookings on one date"
      ],
      [
        "b [6 Oct 45, 7 Oct 30] (60 min log)",
        () => ({
          logs: [
            {
              logId: ids.b,
              bookings: [booking("2026-10-06", 45), booking("2026-10-07", 30)]
            }
          ]
        }),
        "logs.0.bookings",
        "adds up to more than the log's duration"
      ],
      [
        "the unsorted log c with a booking",
        () => ({
          logs: [
            validB(),
            { logId: ids.c, bookings: [booking("2026-10-06", 15)] }
          ]
        }),
        "logs.1.bookings",
        "can't be booked"
      ],
      [
        "the excluded log d with a booking",
        () => ({
          logs: [
            validB(),
            { logId: ids.d, bookings: [booking("2026-10-06", 15)] }
          ]
        }),
        "logs.1.bookings",
        "can't be booked"
      ]
    ];

    it.each(cases)(
      "AC-4 API-BOOK-002: %s → 400",
      async (_, body, field, message) => {
        const response = await as(user).put("/bookings", body());

        expect(response.status, JSON.stringify(response.body)).toBe(400);
        expect(response.body.type).toBe(errorType("validation"));
        expect(fieldsOf(response.body)).toContain(field);
        if (message) expect(messageOf(response.body, field)).toBe(message);
      }
    );

    it("AC-4 API-BOOK-002: the rejected requests changed nothing; c and d with [] → 200", async () => {
      expect(await bookingsOf(user, ids.a)).toEqual([OCT7_120]);
      expect(await bookingsOf(user, ids.b)).toEqual([]);

      const response = await as(user).put("/bookings", {
        logs: [
          { logId: ids.c, bookings: [] },
          { logId: ids.d, bookings: [] }
        ]
      });
      expect(response.status, JSON.stringify(response.body)).toBe(200);
      expect(response.body.items.map((i) => i.bookings)).toEqual([[], []]);
    });
  });

  it("AC-5 API-BOOK-002: another user's log or an unknown id among the logs → 404, and nothing changes", async () => {
    const { user, logs } = await seed();
    const other = await insertUser({ time_zone: "Europe/Zagreb" });
    const otherProject = await insertProject(other.id, { title: "Anthropic" });
    const otherLog = await createLog(other, {
      workDate: "2026-10-06",
      durationMinutes: 60,
      projectId: otherProject.id
    });

    for (const foreign of [otherLog.id, randomUUID()]) {
      const response = await as(user).put("/bookings", {
        logs: [
          { logId: logs.b.id, bookings: [OCT6_30] },
          { logId: logs.f.id, bookings: [] },
          { logId: foreign, bookings: [OCT6_30] }
        ]
      });
      expect(response.status, foreign).toBe(404);
      expect(response.body.type).toBe(errorType("not-found"));
    }
    expect(await bookingsOf(user, logs.b.id)).toEqual([]);
    expect(await bookingsOf(user, logs.f.id)).toEqual([OCT6_30, OCT7_45]);
    expect(await bookingsOf(other, otherLog.id)).toEqual([]);
  });

  describe("AC-6 API-TLOG-004: edits that keep a log bookable and long enough keep its bookings", () => {
    const edits: [string, (t: { pmId: string }) => object][] = [
      ["durationMinutes 300", () => ({ durationMinutes: 300 })],
      ["text", () => ({ text: "Refactoring" })],
      [
        "workDate 2026-10-05",
        () => ({ workDate: "2026-10-05", dayStartMinute: 540 })
      ],
      ["taskId of Nvidia/PM", ({ pmId }) => ({ taskId: pmId })]
    ];

    it.each(edits)(
      "AC-6 API-TLOG-004: PATCH %s → e keeps [7 Oct 240]",
      async (_, edit) => {
        const { user, logs, tasks } = await seed();

        const response = await as(user).patch(
          `/time-logs/${logs.e.id}`,
          edit({ pmId: tasks.pm.id })
        );

        expect(response.status, JSON.stringify(response.body)).toBe(200);
        expect(await bookingsOf(user, logs.e.id)).toEqual([OCT7_240]);
      }
    );
  });

  it("AC-7 API-TLOG-004: a duration below the booked time → 400 on durationMinutes and nothing changes; down to the booked time → 200", async () => {
    const { user, logs } = await seed();
    const { e, f } = logs;

    const shorter = await as(user).patch(`/time-logs/${e.id}`, {
      durationMinutes: 180
    });
    expect(shorter.status, JSON.stringify(shorter.body)).toBe(400);
    expect(shorter.body.type).toBe(errorType("validation"));
    expect(messageOf(shorter.body, "durationMinutes")).toBe(
      "4h of this log is booked. Remove bookings first, or keep at least 4h."
    );
    expect(await itemOf(user, e.id)).toMatchObject({
      durationMinutes: 240,
      bookings: [OCT7_240]
    });

    const partly = await as(user).patch(`/time-logs/${f.id}`, {
      durationMinutes: 60
    });
    expect(partly.status, JSON.stringify(partly.body)).toBe(400);
    expect(messageOf(partly.body, "durationMinutes")).toBe(
      "1h 15m of this log is booked. Remove bookings first, or keep at least 1h 15m."
    );
    expect((await itemOf(user, f.id)).durationMinutes).toBe(135);

    const exact = await as(user).patch(`/time-logs/${f.id}`, {
      durationMinutes: 75
    });
    expect(exact.status, JSON.stringify(exact.body)).toBe(200);
    expect(await itemOf(user, f.id)).toMatchObject({
      durationMinutes: 75,
      bookings: [OCT6_30, OCT7_45]
    });

    const moved = await as(user).patch(`/time-logs/${e.id}`, {
      durationMinutes: 180,
      workDate: "2026-10-08",
      dayStartMinute: 540
    });
    expect(moved.status, JSON.stringify(moved.body)).toBe(400);
    expect(fieldsOf(moved.body)).toContain("durationMinutes");
    const day = await as(user).get("/workdays/2026-10-08");
    expect(day.status).toBe(200);
    expect(day.body.startMinute).toBeNull();
    expect(day.body.logs).toEqual([]);
    expect(await itemOf(user, e.id)).toMatchObject({
      workDate: "2026-10-07",
      durationMinutes: 240
    });
  });

  it("AC-8 API-TLOG-004: excluding a log or removing its project removes its bookings (even with a shorter duration); another project keeps them", async () => {
    const { user, logs, projects } = await seed();

    const excluded = await as(user).patch(`/time-logs/${logs.e.id}`, {
      excludeFromStats: true
    });
    expect(excluded.status, JSON.stringify(excluded.body)).toBe(200);
    expect(await bookingsOf(user, logs.e.id)).toEqual([]);

    const shortened = await as(user).patch(`/time-logs/${logs.f.id}`, {
      excludeFromStats: true,
      durationMinutes: 15
    });
    expect(shortened.status, JSON.stringify(shortened.body)).toBe(200);
    expect(await itemOf(user, logs.f.id)).toMatchObject({
      durationMinutes: 15,
      bookings: []
    });

    const unlinked = await as(user).patch(`/time-logs/${logs.a.id}`, {
      projectId: null
    });
    expect(unlinked.status, JSON.stringify(unlinked.body)).toBe(200);
    expect(await bookingsOf(user, logs.a.id)).toEqual([]);

    const moved = await as(user).patch(`/time-logs/${logs.g.id}`, {
      projectId: projects.internal.id
    });
    expect(moved.status, JSON.stringify(moved.body)).toBe(200);
    expect(await bookingsOf(user, logs.g.id)).toEqual([OCT1_60]);
  });

  it("AC-9 API-TLOG-006, API-WD-004: deleting a log or its day deletes its bookings; a log booked to the deleted day keeps its booking", async () => {
    const first = await seed();

    expect(
      (await as(first.user).delete(`/time-logs/${first.logs.a.id}`)).status
    ).toBe(204);
    const items = await listBookings(first.user, "2026-10-01", "2026-10-09");
    expect(items.map((i) => i.id)).not.toContain(first.logs.a.id);
    expect(await bookingRowCount(first.logs.a.id)).toBe(0);

    const { user, logs } = await seed();
    expect((await as(user).delete("/workdays/2026-10-07")).status).toBe(204);
    const after = await listBookings(user, "2026-10-01", "2026-10-09");
    expect(after.map((i) => i.id)).not.toContain(logs.e.id);
    expect(after.map((i) => i.id)).not.toContain(logs.f.id);
    expect(await bookingRowCount(logs.e.id)).toBe(0);
    expect(await bookingRowCount(logs.f.id)).toBe(0);
    expect(await bookingsOf(user, logs.a.id)).toEqual([OCT7_120]);
  });

  it("AC-10 API-TLOG-001: a project's or task's logs carry their bookings; bookedMinutes sums the bookings", async () => {
    const { user, logs, projects, tasks } = await seed();

    const byProject = await as(user).get(
      `/time-logs?projectId=${projects.anthropic.id}`
    );
    expect(byProject.status, JSON.stringify(byProject.body)).toBe(200);
    expect(byProject.body).toMatchObject({
      totalMinutes: 345,
      bookedMinutes: 195
    });
    const bookingsById = Object.fromEntries(
      byProject.body.items.map((i) => [i.id, i.bookings])
    );
    expect(bookingsById).toEqual({
      [logs.a.id]: [OCT7_120],
      [logs.d.id]: [],
      [logs.f.id]: [OCT6_30, OCT7_45]
    });
    for (const item of byProject.body.items) {
      expect(item).not.toHaveProperty("bookingDate");
    }

    const byTask = await as(user).get(`/time-logs?taskId=${tasks.meetings.id}`);
    expect(byTask.status, JSON.stringify(byTask.body)).toBe(200);
    expect(byTask.body.bookedMinutes).toBe(195);
  });

  it("AC-11 API-RPT-001: booked minutes count on the log's work date and project, whatever the bookings' dates", async () => {
    const { user } = await seed();

    const report = await as(user).get(
      "/reports/dashboard?from=2026-10-01&to=2026-10-09"
    );
    expect(report.status, JSON.stringify(report.body)).toBe(200);
    expect(report.body.days.map((d) => [d.workDate, d.bookedMinutes])).toEqual([
      ["2026-10-06", 120],
      ["2026-10-07", 315]
    ]);
    const bookedOf = (title: string) =>
      report.body.projects.find((p) => p.project?.title === title)
        ?.bookedMinutes;
    expect(bookedOf("Anthropic")).toBe(195);
    expect(bookedOf("Nvidia")).toBe(240);

    const sep30 = await as(user).get(
      "/reports/dashboard?from=2026-09-30&to=2026-09-30"
    );
    expect(sep30.status, JSON.stringify(sep30.body)).toBe(200);
    expect(sep30.body.days).toMatchObject([
      { workDate: "2026-09-30", bookedMinutes: 60 }
    ]);
  });
});
