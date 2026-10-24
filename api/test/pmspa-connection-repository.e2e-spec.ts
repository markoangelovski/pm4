import { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { PmspaConnectionRepository } from "../src/integrations/pmspa/pmspa-connection.repository.js";
import { DNS_LOOKUP } from "../src/integrations/pmspa/pmspa-host-guard.js";
import { PMSPA_FETCH } from "../src/integrations/pmspa/pmspa-transport.js";
import { createTestApp } from "./create-test-app.js";
import {
  accessTokenFor,
  closeTestClients,
  deleteTestUsers,
  insertUser,
  testDb,
  type UserRow
} from "./support/auth-test-utils.js";
import { FakePmspa, fakeLookup } from "./support/fake-pmspa.js";

const PMSPA_URL = "https://pmspa.test";

interface ConnectionRow {
  status: string;
  url: string;
  email: string;
  last_checked_at: Date;
}

async function findConnection(userId: string): Promise<ConnectionRow> {
  const result = await testDb().query<ConnectionRow>(
    `SELECT status, url, email, last_checked_at
     FROM pmspa_connections WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0];
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("PmspaConnectionRepository.setStatusFor", () => {
  let app: NestExpressApplication;
  let fake: FakePmspa;
  let repository: PmspaConnectionRepository;

  beforeAll(async () => {
    // The app keeps one fetch; it forwards to the current test's fake.
    const fetchViaFake: typeof globalThis.fetch = (input, init) =>
      fake.fetch(input, init);
    app = await createTestApp([
      { provide: PMSPA_FETCH, useValue: fetchViaFake },
      { provide: DNS_LOOKUP, useValue: fakeLookup }
    ]);
    repository = app.get(PmspaConnectionRepository);
  });

  beforeEach(() => {
    fake = new FakePmspa();
    fake.accounts = [
      {
        id: "65f1a0c0ffee00000000000a",
        email: "x@pmspa.test",
        password: "secret",
        avatarUrl: null,
        role: "admin"
      }
    ];
  });

  afterAll(async () => {
    await deleteTestUsers();
    await closeTestClients();
    await app.close();
  });

  /** Saves a connection to `PMSPA_URL` as the fake account X; the row is `connected`. */
  const connect = async (): Promise<UserRow> => {
    const user = await insertUser();
    const res = await request(app.getHttpServer())
      .put("/api/v1/integrations/pmspa")
      .set("Authorization", `Bearer ${accessTokenFor(user.id)}`)
      .send({ url: PMSPA_URL, email: "x@pmspa.test", password: "secret" });
    expect(res.status).toBe(200);
    expect((await findConnection(user.id)).status).toBe("connected");
    return user;
  };

  it("match: the row's URL and email → true; status and last_checked_at are written", async () => {
    const user = await connect();
    const before = await findConnection(user.id);
    await wait(20);

    const matched = await repository.setStatusFor(
      user.id,
      { url: before.url, email: before.email },
      "unreachable"
    );

    expect(matched).toBe(true);
    const after = await findConnection(user.id);
    expect(after.status).toBe("unreachable");
    expect(after.last_checked_at.getTime()).toBeGreaterThan(
      before.last_checked_at.getTime()
    );
  });

  it("email changed: the old email → false; status and last_checked_at are unchanged", async () => {
    const user = await connect();
    const before = await findConnection(user.id);
    await testDb().query(
      "UPDATE pmspa_connections SET email = $1 WHERE user_id = $2",
      ["changed@pmspa.test", user.id]
    );
    await wait(20);

    const matched = await repository.setStatusFor(
      user.id,
      { url: before.url, email: before.email },
      "unreachable"
    );

    expect(matched).toBe(false);
    const after = await findConnection(user.id);
    expect(after.status).toBe("connected");
    expect(after.last_checked_at.getTime()).toBe(
      before.last_checked_at.getTime()
    );
  });

  it("URL changed: the old URL → false; status and last_checked_at are unchanged", async () => {
    const user = await connect();
    const before = await findConnection(user.id);
    await testDb().query(
      "UPDATE pmspa_connections SET url = $1 WHERE user_id = $2",
      ["https://other.pmspa.test", user.id]
    );
    await wait(20);

    const matched = await repository.setStatusFor(
      user.id,
      { url: before.url, email: before.email },
      "unreachable"
    );

    expect(matched).toBe(false);
    const after = await findConnection(user.id);
    expect(after.status).toBe("connected");
    expect(after.last_checked_at.getTime()).toBe(
      before.last_checked_at.getTime()
    );
  });
});
