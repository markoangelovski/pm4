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

describe("TasksRepository.update", () => {
  it("moves the task's time logs, notes and to-dos when the project changes", async () => {
    const updates: string[] = [];
    const tx = {
      update: () => {
        const chain: Record<string, unknown> = {};
        chain.set = (values: Record<string, unknown>) => {
          updates.push(Object.keys(values).join(","));
          return chain;
        };
        chain.where = () => Promise.resolve();
        return chain;
      }
    };
    const db = { transaction: (fn: (t: typeof tx) => Promise<void>) => fn(tx) };
    const module = await Test.createTestingModule({
      providers: [TasksRepository, { provide: DRIZZLE, useValue: db }]
    }).compile();
    const repository = module.get(TasksRepository);

    await repository.update("u", "t", { projectId: "p", title: "x" });
    expect(updates).toEqual([
      "projectId,title,updatedAt",
      "projectId",
      "projectId",
      "projectId"
    ]);

    updates.length = 0;
    await repository.update("u", "t", { title: "x" });
    expect(updates).toEqual(["title,updatedAt"]);
  });
});
