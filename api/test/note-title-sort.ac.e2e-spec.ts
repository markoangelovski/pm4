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
import { insertNote, insertTodo } from "./support/note-test-utils.js";

interface Body {
  items: { id: string; title?: string | null }[];
  page: number;
  pageSize: number;
  total: number;
  errors?: { field: string; message: string }[];
}

interface Res {
  status: number;
  body: Body;
}

describe("Notes Title A–Z and the to-dos' own sort (feat-prj-lists)", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await deleteTestUsers();
    await closeTestClients();
    await app.close();
  });

  const get = async (user: UserRow, url: string): Promise<Res> => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1${url}`)
      .set("Authorization", `Bearer ${accessTokenFor(user.id)}`);
    return { status: response.status, body: response.body as Body };
  };

  const ids = async (user: UserRow, url: string) => {
    const response = await get(user, url);
    expect(response.status).toBe(200);
    return response.body.items.map((item) => item.id);
  };

  const at = (iso: string) => new Date(iso);

  /** User A (Zagreb) with six notes, two of them untitled; user B with one. */
  const seed = async () => {
    const a = await insertUser({ time_zone: "Europe/Zagreb" });
    const banana = await insertNote(a.id, {
      title: "Banana",
      updated_at: at("2026-10-03T08:00:00Z")
    });
    const appleLower = await insertNote(a.id, {
      title: "apple",
      updated_at: at("2026-10-01T08:00:00Z")
    });
    const appleUpper = await insertNote(a.id, {
      title: "Apple",
      updated_at: at("2026-10-02T08:00:00Z")
    });
    const cherry = await insertNote(a.id, {
      title: "Cherry",
      updated_at: at("2026-10-04T08:00:00Z")
    });
    const u1 = await insertNote(a.id, {
      body: "Untitled one",
      updated_at: at("2026-10-05T08:00:00Z")
    });
    const u2 = await insertNote(a.id, {
      body: "Untitled two",
      updated_at: at("2026-10-07T08:00:00Z")
    });
    const b = await insertUser();
    await insertNote(b.id, { title: "Aardvark" });
    return { a, banana, appleLower, appleUpper, cherry, u1, u2 };
  };

  it("AC-1 FR-NOTE-002: title:asc is A–Z ignoring case, equal titles most recently edited first, untitled last; only the user's notes", async () => {
    const { a, banana, appleLower, appleUpper, cherry, u1, u2 } = await seed();

    expect(await ids(a, "/notes?sort=title:asc")).toEqual([
      appleUpper.id,
      appleLower.id,
      banana.id,
      cherry.id,
      u2.id,
      u1.id
    ]);
  });

  it("AC-2 FR-NOTE-002: title:asc ranges on the last edit in the user's time zone", async () => {
    const a = await insertUser({ time_zone: "Europe/Zagreb" });
    // 22:30Z on 9 Oct is 00:30 on 10 Oct in Zagreb.
    const editedInRange = await insertNote(a.id, {
      title: "Edited in range",
      created_at: at("2026-10-01T08:00:00Z"),
      updated_at: at("2026-10-09T22:30:00Z")
    });
    await insertNote(a.id, {
      title: "Created in range",
      created_at: at("2026-10-10T08:00:00Z"),
      updated_at: at("2026-10-05T08:00:00Z")
    });

    expect(await ids(a, "/notes?sort=title:asc&from=2026-10-10")).toEqual([
      editedInRange.id
    ]);
  });

  it("AC-3 FR-NOTE-002: title:asc pages", async () => {
    const { a, banana, cherry } = await seed();

    const page = await get(a, "/notes?sort=title:asc&pageSize=2&page=2");
    expect(page.status).toBe(200);
    expect(page.body).toMatchObject({ page: 2, pageSize: 2, total: 6 });
    expect(page.body.items.map((n) => n.id)).toEqual([banana.id, cherry.id]);
  });

  it("AC-4 FR-NOTE-005: GET /todos rejects title:asc and takes createdAt:asc", async () => {
    const a = await insertUser({ time_zone: "Europe/Zagreb" });
    const newer = await insertTodo(a.id, {
      text: "Newer",
      created_at: at("2026-10-05T08:00:00Z")
    });
    const older = await insertTodo(a.id, {
      text: "Older",
      created_at: at("2026-10-01T08:00:00Z")
    });

    const rejected = await get(a, "/todos?sort=title:asc");
    expect(rejected.status).toBe(400);
    expect((rejected.body.errors ?? []).map((e) => e.field)).toContain("sort");

    expect(await ids(a, "/todos?sort=createdAt:asc")).toEqual([
      older.id,
      newer.id
    ]);
  });
});
