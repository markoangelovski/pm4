import { describe, expect, it, vi } from "vitest";
import type { DrizzleDb } from "../../database/drizzle.js";
import { PmspaSyncRepository } from "./pmspa-sync.repository.js";

// The SQL runs against Postgres in test/pmspa-sync.ac.e2e-spec.ts; this checks the short-cut paths.
describe("PmspaSyncRepository", () => {
  it("titles of no ids is an empty map, without a query", async () => {
    const repo = new PmspaSyncRepository({} as unknown as DrizzleDb);
    const titles = await repo.titles("u", "task", []);
    expect(titles.size).toBe(0);
  });

  it("pm4LogWorkDate: the work date of the caller's log, null when there is none", async () => {
    const limit = vi
      .fn()
      .mockResolvedValueOnce([{ workDate: "2026-10-16" }])
      .mockResolvedValueOnce([]);
    const db = {
      select: () => ({
        from: () => ({ where: () => ({ limit }) })
      })
    };
    const repo = new PmspaSyncRepository(db as unknown as DrizzleDb);

    expect(await repo.pm4LogWorkDate("u", "l1")).toBe("2026-10-16");
    expect(await repo.pm4LogWorkDate("other", "l1")).toBeNull();
  });
});
