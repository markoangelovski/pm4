import { describe, expect, it } from "vitest";
import type { DrizzleDb } from "../../database/drizzle.js";
import { PmspaSyncRepository } from "./pmspa-sync.repository.js";

// The SQL runs against Postgres in test/pmspa-sync.ac.e2e-spec.ts; this checks the short-cut paths.
describe("PmspaSyncRepository", () => {
  it("titles of no ids is an empty map, without a query", async () => {
    const repo = new PmspaSyncRepository({} as unknown as DrizzleDb);
    const titles = await repo.titles("u", "task", []);
    expect(titles.size).toBe(0);
  });
});
