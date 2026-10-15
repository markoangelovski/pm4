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
import { insertProject } from "./support/project-test-utils.js";

const errorType = (slug: string) => `${process.env.WEB_APP_URL}/errors/${slug}`;

/** Noon in Zagreb on 2026-10-07: "today" for a user in `Europe/Zagreb`. */
const NOW = new Date("2026-10-07T10:00:00.000Z");
const DAY = "2026-10-06";
const EARLIER = "2026-10-05";
const TOMORROW = "2026-10-08";

interface TimeLogBody {
  id: string;
  workDate: string;
  durationMinutes: number;
  text: string;
}

/** Any response body these tests read: a log, a day, a list or a Problem. */
interface Body extends TimeLogBody {
  startMinute: number | null;
  totalMinutes: number;
  logs: TimeLogBody[];
  items: (TimeLogBody & { bookingDate: string | null })[];
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

describe("Delete day API (feat-hard-delete)", () => {
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
      delete: (url: string) =>
        send(request(server).delete(`/api/v1${url}`).set("Authorization", auth))
    };
  };

  /** Creates a log for `user` (day start 09:00 when it is the date's first) and returns it. */
  const createLog = async (
    user: UserRow,
    fields: Record<string, unknown>
  ): Promise<TimeLogBody> => {
    const response = await as(user).post("/time-logs", {
      durationMinutes: 30,
      text: "Work",
      dayStartMinute: 540,
      ...fields
    });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    return response.body;
  };

  const book = async (user: UserRow, logIds: string[], bookingDate: string) => {
    const response = await as(user).put("/bookings", { logIds, bookingDate });
    expect(response.status, JSON.stringify(response.body)).toBe(200);
  };

  const getDay = async (user: UserRow, date: string): Promise<Body> => {
    const response = await as(user).get(`/workdays/${date}`);
    expect(response.status).toBe(200);
    return response.body;
  };

  it("AC-8 API-WD-004: DELETE removes the day's start and logs; a log of another day booked to it keeps its booking", async () => {
    const a = await insertUser({ time_zone: "Europe/Zagreb" });
    const p = await insertProject(a.id, { title: "Website" });
    const earlier = await createLog(a, {
      workDate: EARLIER,
      projectId: p.id,
      durationMinutes: 45
    });
    const first = await createLog(a, {
      workDate: DAY,
      projectId: p.id,
      durationMinutes: 60
    });
    await createLog(a, { workDate: DAY, durationMinutes: 30 });
    await book(a, [first.id, earlier.id], DAY);

    const deleted = await as(a).delete(`/workdays/${DAY}`);
    expect(deleted.status).toBe(204);

    expect(await getDay(a, DAY)).toEqual({
      workDate: DAY,
      startMinute: null,
      totalMinutes: 0,
      logs: []
    });
    const month = await as(a).get("/workdays?from=2026-10-01&to=2026-10-31");
    expect(month.status).toBe(200);
    expect(month.body.items.map((i) => i.workDate)).toEqual([EARLIER]);

    const bookings = await as(a).get(`/bookings?from=${DAY}&to=${DAY}`);
    expect(bookings.status).toBe(200);
    expect(bookings.body.items.map((i) => [i.id, i.bookingDate])).toEqual([
      [earlier.id, DAY]
    ]);
    expect((await getDay(a, EARLIER)).logs.map((l) => l.id)).toEqual([
      earlier.id
    ]);

    const again = await as(a).delete(`/workdays/${DAY}`);
    expect(again.status).toBe(404);
    expect(again.body.type).toBe(errorType("not-found"));
  });

  it("AC-8 API-WD-004: a day with only a start → 204; a future date → 404; an invalid date → 400", async () => {
    const a = await insertUser({ time_zone: "Europe/Zagreb" });
    const start = await as(a).put(`/workdays/${DAY}`, { startMinute: 480 });
    expect(start.status).toBe(200);

    const deleted = await as(a).delete(`/workdays/${DAY}`);
    expect(deleted.status).toBe(204);
    expect((await getDay(a, DAY)).startMinute).toBeNull();

    const future = await as(a).delete(`/workdays/${TOMORROW}`);
    expect(future.status).toBe(404);
    expect(future.body.type).toBe(errorType("not-found"));

    const invalid = await as(a).delete("/workdays/2026-13-01");
    expect(invalid.status).toBe(400);
    expect(invalid.body.type).toBe(errorType("validation"));
  });

  it("AC-8 API-WD-004: another user's start and logs on that date stay", async () => {
    const a = await insertUser({ time_zone: "Europe/Zagreb" });
    const b = await insertUser({ time_zone: "Europe/Zagreb" });
    await createLog(a, { workDate: DAY });
    const bLog = await createLog(b, { workDate: DAY, durationMinutes: 45 });

    expect((await as(a).delete(`/workdays/${DAY}`)).status).toBe(204);

    const bDay = await getDay(b, DAY);
    expect(bDay.startMinute).toBe(540);
    expect(bDay.totalMinutes).toBe(45);
    expect(bDay.logs.map((l) => l.id)).toEqual([bLog.id]);
  });

  it("AC-8 API-WD-004: without a token → 401", async () => {
    const response = await send(
      request(app.getHttpServer()).delete(`/api/v1/workdays/${DAY}`)
    );
    expect(response.status).toBe(401);
    expect(response.body.type).toBe(errorType("unauthorized"));
  });
});
