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

const errorType = (slug: string) => `${process.env.WEB_APP_URL}/errors/${slug}`;

interface Body {
  id: string;
  timeZone: string;
  dailyTargetMinutes: number;
  type: string;
  errors?: { field: string; message: string }[];
}

describe("Profile settings: PATCH /api/v1/me (feat-tlog-api)", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await deleteTestUsers();
    await closeTestClients();
    await app.close();
  });

  const as = (user: UserRow) => {
    const server = app.getHttpServer();
    const auth = `Bearer ${accessTokenFor(user.id)}`;
    return {
      get: async () => {
        const response = await request(server)
          .get("/api/v1/me")
          .set("Authorization", auth);
        return { status: response.status, body: response.body as Body };
      },
      patch: async (body: object) => {
        const response = await request(server)
          .patch("/api/v1/me")
          .set("Authorization", auth)
          .send(body);
        return { status: response.status, body: response.body as Body };
      }
    };
  };

  const fieldsOf = (body: Body) => (body.errors ?? []).map((e) => e.field);

  it("AC-1 API-USR-002: dailyTargetMinutes defaults to 420; PATCH sets it and the time zone; {} → 200", async () => {
    const a = await insertUser({ time_zone: "Europe/Zagreb" });

    const initial = await as(a).get();
    expect(initial.status).toBe(200);
    expect(initial.body.dailyTargetMinutes).toBe(420);

    const target = await as(a).patch({ dailyTargetMinutes: 480 });
    expect(target.status).toBe(200);
    expect(target.body).toMatchObject({
      id: a.id,
      dailyTargetMinutes: 480,
      timeZone: "Europe/Zagreb"
    });
    expect((await as(a).get()).body.dailyTargetMinutes).toBe(480);

    const zone = await as(a).patch({ timeZone: "Europe/London" });
    expect(zone.status).toBe(200);
    expect(zone.body).toMatchObject({
      timeZone: "Europe/London",
      dailyTargetMinutes: 480
    });
    expect((await as(a).get()).body.timeZone).toBe("Europe/London");

    const empty = await as(a).patch({});
    expect(empty.status).toBe(200);
    expect(empty.body).toMatchObject({
      timeZone: "Europe/London",
      dailyTargetMinutes: 480
    });
  });

  describe("AC-2 API-USR-002: invalid settings → 400 naming the field; no token → 401", () => {
    let a: UserRow;

    beforeAll(async () => {
      a = await insertUser();
    });

    const cases: [string, object, string][] = [
      [
        "dailyTargetMinutes 10",
        { dailyTargetMinutes: 10 },
        "dailyTargetMinutes"
      ],
      [
        "dailyTargetMinutes 20",
        { dailyTargetMinutes: 20 },
        "dailyTargetMinutes"
      ],
      [
        "dailyTargetMinutes 1455",
        { dailyTargetMinutes: 1455 },
        "dailyTargetMinutes"
      ],
      [
        "dailyTargetMinutes 1.5",
        { dailyTargetMinutes: 1.5 },
        "dailyTargetMinutes"
      ],
      [
        "dailyTargetMinutes null",
        { dailyTargetMinutes: null },
        "dailyTargetMinutes"
      ],
      ['timeZone "Nope/Zone"', { timeZone: "Nope/Zone" }, "timeZone"],
      ["timeZone null", { timeZone: null }, "timeZone"]
    ];

    it.each(cases)("AC-2 API-USR-002: %s → 400", async (_, body, field) => {
      const response = await as(a).patch(body);

      expect(response.status).toBe(400);
      expect(response.body.type).toBe(errorType("validation"));
      expect(fieldsOf(response.body)).toContain(field);
    });

    it("AC-2 API-USR-002: nothing was changed by the rejected requests", async () => {
      const me = await as(a).get();
      expect(me.body).toMatchObject({
        timeZone: "Europe/Zagreb",
        dailyTargetMinutes: 420
      });
    });

    it("AC-2 API-USR-002: without a token → 401", async () => {
      const response = await request(app.getHttpServer())
        .patch("/api/v1/me")
        .send({ dailyTargetMinutes: 480 });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({ type: errorType("unauthorized") });
    });
  });
});
