import { Test, TestingModule } from "@nestjs/testing";
import { DRIZZLE } from "../database/drizzle.js";
import { ProjectsRepository } from "./projects.repository.js";

// The SQL itself (counts, filters, sorting, scoping) is covered by
// test/projects.ac.e2e-spec.ts against Postgres; this checks the mapping.
describe("ProjectsRepository", () => {
  let repository: ProjectsRepository;
  let rows: unknown[];

  beforeEach(async () => {
    rows = [];
    const query: Record<string, unknown> = {};
    for (const method of [
      "select",
      "from",
      "where",
      "groupBy",
      "leftJoin",
      "$dynamic"
    ]) {
      query[method] = () => query;
    }
    query.as = () => ({
      projectId: "c.project_id",
      upcoming: "c.upcoming",
      inProgress: "c.in_progress",
      completed: "c.completed"
    });
    query.limit = () => Promise.resolve(rows);
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProjectsRepository, { provide: DRIZZLE, useValue: query }]
    }).compile();

    repository = module.get<ProjectsRepository>(ProjectsRepository);
  });

  it("findById nests the task counts", async () => {
    rows = [
      { id: "p-1", title: "Web", upcoming: 2, inProgress: 1, completed: 0 }
    ];
    await expect(repository.findById("user-1", "p-1")).resolves.toEqual({
      id: "p-1",
      title: "Web",
      counts: { upcoming: 2, inProgress: 1, completed: 0 }
    });
  });

  it("findById returns null when there is no row", async () => {
    await expect(repository.findById("user-1", "p-1")).resolves.toBeNull();
  });
});
