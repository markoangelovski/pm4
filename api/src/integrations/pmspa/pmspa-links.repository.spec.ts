import { describe, expect, it } from "vitest";
import type { DrizzleDb } from "../../database/drizzle.js";
import { PmspaLinksRepository } from "./pmspa-links.repository.js";

// The SQL runs against Postgres in test/pmspa-sync.ac.e2e-spec.ts; this checks the wiring of the empty case.
describe("PmspaLinksRepository", () => {
  it("delete reports false when no row was deleted", async () => {
    const db = {
      delete: () => ({
        where: () => ({ returning: () => Promise.resolve([]) })
      })
    };
    const repo = new PmspaLinksRepository(db as unknown as DrizzleDb);
    await expect(repo.delete("u", "project", "p")).resolves.toBe(false);
  });
});
