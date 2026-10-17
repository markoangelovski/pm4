import { describe, expect, it, vi } from "vitest";
import type { DrizzleDb } from "../../database/drizzle.js";
import { PmspaConnectionRepository } from "./pmspa-connection.repository.js";

// The SQL (upsert, link counts, the transaction) runs against Postgres in
// test/pmspa-connection.ac.e2e-spec.ts; this checks the mapping and wiring.
function chain(result: unknown) {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "from", "where", "update", "set", "delete"]) {
    q[m] = () => q;
  }
  q.limit = () => Promise.resolve(result);
  q.then = (res: (v: unknown) => unknown) => Promise.resolve(result).then(res);
  return q;
}

describe("PmspaConnectionRepository", () => {
  it("find returns the row or null", async () => {
    const row = { userId: "u" };
    await expect(
      new PmspaConnectionRepository(chain([row]) as unknown as DrizzleDb).find(
        "u"
      )
    ).resolves.toBe(row);
    await expect(
      new PmspaConnectionRepository(chain([]) as unknown as DrizzleDb).find("u")
    ).resolves.toBeNull();
  });

  it("countOtherAccountLinks sums the three link tables", async () => {
    const repo = new PmspaConnectionRepository(
      chain([{ n: 2 }]) as unknown as DrizzleDb
    );
    await expect(
      repo.countOtherAccountLinks("u", "a".repeat(24))
    ).resolves.toBe(6);
  });

  it("switchAccount deletes the links then upserts, in one transaction", async () => {
    const calls: string[] = [];
    const tx = {
      delete: () => ({
        where: () => (calls.push("delete"), Promise.resolve())
      }),
      insert: () => ({
        values: () => ({
          onConflictDoUpdate: () => ({
            returning: () => (
              calls.push("upsert"),
              Promise.resolve([{ userId: "u" }])
            )
          })
        })
      })
    };
    const transaction = vi.fn((fn: (t: typeof tx) => unknown) => fn(tx));
    const repo = new PmspaConnectionRepository({
      transaction
    } as unknown as DrizzleDb);
    await repo.switchAccount({
      userId: "u",
      url: "https://pmspa.test",
      email: "e",
      passwordEnc: Buffer.alloc(1),
      status: "connected",
      pmspaUserId: "a".repeat(24),
      lastCheckedAt: new Date()
    });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(["delete", "delete", "delete", "upsert"]);
  });
});
