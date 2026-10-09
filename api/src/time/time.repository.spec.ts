import { Test, TestingModule } from "@nestjs/testing";
import { DRIZZLE } from "../database/drizzle.js";
import { TimeRepository } from "./time.repository.js";

// The SQL itself is covered by test/time-logs.ac.e2e-spec.ts against Postgres.
describe("TimeRepository", () => {
  let repository: TimeRepository;
  let rows: unknown[];

  beforeEach(async () => {
    rows = [];
    const query: Record<string, unknown> = {};
    for (const method of ["select", "from", "where"]) {
      query[method] = () => query;
    }
    query.limit = () => Promise.resolve(rows);
    const module: TestingModule = await Test.createTestingModule({
      providers: [TimeRepository, { provide: DRIZZLE, useValue: query }]
    }).compile();
    repository = module.get(TimeRepository);
  });

  it("getWorkday returns the start minute or null", async () => {
    rows = [{ startMinute: 540 }];
    await expect(repository.getWorkday("u", "2026-10-07")).resolves.toBe(540);
    rows = [];
    await expect(repository.getWorkday("u", "2026-10-07")).resolves.toBeNull();
  });
});
