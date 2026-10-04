import { Test, TestingModule } from "@nestjs/testing";
import { DRIZZLE } from "../database/drizzle.js";
import { TasksRepository } from "./tasks.repository.js";

// The SQL itself (filters, sorting, scoping) is covered by
// test/tasks.ac.e2e-spec.ts against Postgres; this checks the mapping.
describe("TasksRepository", () => {
  let repository: TasksRepository;
  let rows: unknown[];

  beforeEach(async () => {
    rows = [];
    const query: Record<string, unknown> = {};
    for (const method of [
      "select",
      "from",
      "where",
      "innerJoin",
      "leftJoin",
      "$dynamic"
    ]) {
      query[method] = () => query;
    }
    query.limit = () => Promise.resolve(rows);
    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksRepository, { provide: DRIZZLE, useValue: query }]
    }).compile();

    repository = module.get<TasksRepository>(TasksRepository);
  });

  it("findById returns the selected row", async () => {
    rows = [{ id: "t-1", title: "Fix", projectTitle: "Web" }];
    await expect(repository.findById("user-1", "t-1")).resolves.toEqual({
      id: "t-1",
      title: "Fix",
      projectTitle: "Web"
    });
  });

  it("findById returns null when there is no row", async () => {
    await expect(repository.findById("user-1", "t-1")).resolves.toBeNull();
  });
});
