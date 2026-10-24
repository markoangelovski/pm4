import { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { createTestApp } from "./create-test-app.js";
import {
  accessTokenFor,
  closeTestClients,
  deleteTestUsers,
  insertUser
} from "./support/auth-test-utils.js";
import { insertTodo } from "./support/note-test-utils.js";

/** The seeded to-do's `updated_at`, long before the test runs. */
const SEEDED = "2026-10-01T08:00:00.000Z";

// Ordinary e2e test (not an acceptance test): an empty PATCH body changes nothing
// (API-TODO-003). Before the fix it returned 500, because Drizzle throws on `.set({})`.
describe("To-dos API: empty PATCH body", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await deleteTestUsers();
    await closeTestClients();
    await app.close();
  });

  it("API-TODO-003: PATCH /todos/{id} with {} returns 200 and changes nothing", async () => {
    const a = await insertUser({ time_zone: "Europe/Zagreb" });
    const row = await insertTodo(a.id, {
      text: "Call",
      done_at: new Date(SEEDED),
      created_at: new Date(SEEDED),
      updated_at: new Date(SEEDED)
    });

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/todos/${row.id}`)
      .set("Authorization", `Bearer ${accessTokenFor(a.id)}`)
      .send({});

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body).toMatchObject({
      id: row.id,
      text: "Call",
      doneAt: SEEDED,
      updatedAt: SEEDED
    });
  });
});
