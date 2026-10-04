import { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { createTestApp } from "./create-test-app.js";
import {
  accessTokenFor,
  closeTestClients,
  deleteTestUsers,
  deleteUser,
  insertUser,
  type UserRow
} from "./support/auth-test-utils.js";
import {
  insertProject,
  setUserDisplayName
} from "./support/project-test-utils.js";

interface ListBody {
  items: { title: string }[];
  total: number;
}

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);

describe("Project search by lead (feat-prj-dates-lead-search)", () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await deleteTestUsers();
    await closeTestClients();
    await app.close();
  });

  /** `GET /projects` as `user` with the given query; asserts 200. */
  const list = async (user: UserRow, query: Record<string, string>) => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/projects")
      .query(query)
      .set("Authorization", `Bearer ${accessTokenFor(user.id)}`);
    expect(response.status).toBe(200);
    return response.body as ListBody;
  };

  const titles = async (user: UserRow, q: string) =>
    (await list(user, { q })).items.map((p) => p.title).sort();

  it("AC-1 API-PRJ-002: q matching a text lead in any case lists the project", async () => {
    const a = await insertUser();
    await insertProject(a.id, {
      title: "Website",
      project_lead: "Bob Builder"
    });
    await insertProject(a.id, { title: "Other", project_lead: "Carol" });
    await insertProject(a.id, { title: "No lead" });

    expect(await titles(a, "bUILDER")).toEqual(["Website"]);
  });

  it("AC-2 API-PRJ-002: a user lead matches by current name; once the user is gone, by the saved name", async () => {
    const a = await insertUser();
    const lead = await insertUser({ display_name: "Ana Novak" });
    await insertProject(a.id, {
      title: "Led",
      project_lead_user_id: lead.id,
      project_lead: "Ana Novak"
    });

    await setUserDisplayName(lead.id, "Bea Kos");
    expect(await titles(a, "bea")).toEqual(["Led"]);
    expect(await titles(a, "novak")).toEqual([]);

    await deleteUser(lead.id);
    expect(await titles(a, "novak")).toEqual(["Led"]);
    expect(await titles(a, "bea")).toEqual([]);
  });

  it("AC-3 API-PRJ-002: q matching only the lead user's email doesn't list the project", async () => {
    const a = await insertUser();
    const lead = await insertUser({
      display_name: "Dana Scully",
      email: `xfiles-${Date.now()}@example.com`
    });
    await insertProject(a.id, {
      title: "Led",
      project_lead_user_id: lead.id,
      project_lead: "Dana Scully"
    });

    expect(await titles(a, "xfiles")).toEqual([]);
    expect(await titles(a, "scully")).toEqual(["Led"]);
  });

  it("AC-4 API-PRJ-002: title matches come first, each group in the selected sort, paginated across groups", async () => {
    const a = await insertUser();
    // "Beta" sorts between the two title matches by title, and is the most
    // recently updated, so only the grouping can put it last.
    await insertProject(a.id, { title: "Zeta web", updated_at: daysAgo(3) });
    await insertProject(a.id, { title: "Alpha web", updated_at: daysAgo(2) });
    await insertProject(a.id, {
      title: "Beta",
      project_lead: "Webb",
      updated_at: daysAgo(1)
    });
    await insertProject(a.id, { title: "Unrelated" });

    const byTitle = await list(a, { q: "web", sort: "title:asc" });
    expect(byTitle.items.map((p) => p.title)).toEqual([
      "Alpha web",
      "Zeta web",
      "Beta"
    ]);
    expect(byTitle.total).toBe(3);

    const byUpdated = await list(a, { q: "web" });
    expect(byUpdated.items.map((p) => p.title)).toEqual([
      "Alpha web",
      "Zeta web",
      "Beta"
    ]);

    const second = await list(a, {
      q: "web",
      sort: "title:asc",
      pageSize: "2",
      page: "2"
    });
    expect(second.items.map((p) => p.title)).toEqual(["Beta"]);
    expect(second.total).toBe(3);
  });

  it("AC-5 API-PRJ-002: a project whose title and lead both match is listed once", async () => {
    const a = await insertUser();
    await insertProject(a.id, { title: "Web shop", project_lead: "Webster" });

    const body = await list(a, { q: "web" });
    expect(body.items.map((p) => p.title)).toEqual(["Web shop"]);
    expect(body.total).toBe(1);
  });

  it("AC-6 API-PRJ-002: lead wildcards match literally; other users' projects never match", async () => {
    const a = await insertUser();
    const b = await insertUser();
    await insertProject(a.id, { title: "Sale", project_lead: "50% Ltd" });
    await insertProject(a.id, { title: "Five", project_lead: "500 Ltd" });
    await insertProject(b.id, { title: "Not mine", project_lead: "50% Ltd" });

    expect(await titles(a, "50%")).toEqual(["Sale"]);
    expect(await titles(a, "5_%")).toEqual([]);
  });
});
