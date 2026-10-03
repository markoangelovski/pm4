import { randomUUID } from "node:crypto";
import { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { createTestApp } from "./create-test-app.js";
import {
  accessTokenFor,
  closeTestClients,
  deleteTestUsers,
  insertUser,
  uniqueEmail,
  type UserRow
} from "./support/auth-test-utils.js";

interface UserSummary {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
}

interface Body {
  items: UserSummary[];
  type: string;
}

const errorType = (slug: string) => `${process.env.WEB_APP_URL}/errors/${slug}`;

describe("GET /api/v1/users user search (feat-prj-api)", () => {
  let app: NestExpressApplication;
  /** Emails outside the test domain, deleted in `afterAll`. */
  const extraEmails: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await deleteTestUsers(extraEmails);
    await closeTestClients();
    await app.close();
  });

  const search = async (caller: UserRow, q?: string) => {
    const req = request(app.getHttpServer())
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${accessTokenFor(caller.id)}`);
    const response = await (q === undefined ? req : req.query({ q }));
    return { status: response.status, body: response.body as Body };
  };

  it("AC-17 API-USR-003: name or email contains q, sorted by name, exactly the summary fields; the caller first", async () => {
    const caller = await insertUser({ display_name: "Caller" });
    const ana = await insertUser({ display_name: "Ana" });
    const dan = await insertUser({ display_name: "Dan" });
    const bobEmail = `bob.${randomUUID().slice(0, 8)}@han.dev`;
    extraEmails.push(bobEmail);
    const bob = await insertUser({ display_name: "Bob", email: bobEmail });
    const zed = await insertUser({ display_name: "Zed" });
    const seeded = new Set([ana.id, dan.id, bob.id, zed.id]);

    const response = await search(caller, "an");

    expect(response.status).toBe(200);
    const items = response.body.items;
    expect(items.filter((u) => seeded.has(u.id)).map((u) => u.id)).toEqual([
      ana.id,
      bob.id,
      dan.id
    ]);
    expect(items.map((u) => u.id)).not.toContain(zed.id);
    expect(items.map((u) => u.id)).not.toContain(caller.id);
    expect(items.find((u) => u.id === bob.id)).toEqual({
      id: bob.id,
      displayName: "Bob",
      email: bobEmail,
      avatarUrl: bob.avatar_url
    });
    for (const item of items) {
      expect(Object.keys(item).sort()).toEqual([
        "avatarUrl",
        "displayName",
        "email",
        "id"
      ]);
    }

    const zoran = await insertUser({ display_name: "Zoran" });
    const own = await search(zoran, "an");
    expect(own.status).toBe(200);
    expect(own.body.items[0].id).toBe(zoran.id);
  });

  it("AC-18 API-USR-003: at most 10 results; q shorter than 2 (after trimming) or over 100 → 400; % is literal", async () => {
    const caller = await insertUser({ display_name: "Caller" });
    const token = `qx${randomUUID().slice(0, 6)}`;
    for (let i = 0; i < 12; i++) {
      await insertUser({ display_name: `${token} ${i}` });
    }

    const capped = await search(caller, token);
    expect(capped.status).toBe(200);
    expect(capped.body.items).toHaveLength(10);

    for (const q of [undefined, "a", " a ", "x".repeat(101)]) {
      const response = await search(caller, q);
      expect(response.status, `q=${q}`).toBe(400);
      expect(response.body.type).toBe(errorType("validation"));
    }

    const percent = await insertUser({
      display_name: "100%% sure",
      email: uniqueEmail("percent")
    });
    const single = await insertUser({ display_name: "100% sure" });
    const literal = await search(caller, "%%");
    expect(literal.status).toBe(200);
    const items = literal.body.items;
    expect(items.map((u) => u.id)).toContain(percent.id);
    expect(items.map((u) => u.id)).not.toContain(single.id);
    for (const item of items) {
      expect(`${item.displayName} ${item.email}`).toContain("%%");
    }
  });

  it("AC-15 API-USR-003: without a token → 401", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/users")
      .query({ q: "an" });

    expect(response.status).toBe(401);
    expect((response.body as Body).type).toBe(errorType("unauthorized"));
  });
});
