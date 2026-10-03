import { testDb } from "./auth-test-utils.js";

// Seeds `projects` and `tasks` rows directly (feat-prj-api), so the tests don't
// depend on the endpoints they check. Rows go away with their user
// (`ON DELETE cascade`), so `deleteTestUsers()` cleans them up.

export type TaskStatusValue = "upcoming" | "in-progress" | "completed";

export interface ProjectDbRow {
  id: string;
  user_id: string;
  project_lead_user_id: string | null;
  title: string;
  description: string | null;
  external_link: string | null;
  project_lead: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface TaskDbRow {
  id: string;
  user_id: string;
  project_id: string;
  status: TaskStatusValue;
  title: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export async function insertProject(
  userId: string,
  fields: Partial<
    Pick<
      ProjectDbRow,
      | "title"
      | "description"
      | "external_link"
      | "project_lead"
      | "project_lead_user_id"
      | "created_at"
      | "updated_at"
      | "deleted_at"
    >
  > = {}
): Promise<ProjectDbRow> {
  const now = new Date();
  const result = await testDb().query<ProjectDbRow>(
    `INSERT INTO projects (user_id, title, description, external_link, project_lead,
       project_lead_user_id, created_at, updated_at, deleted_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      userId,
      fields.title ?? "Seeded project",
      fields.description ?? null,
      fields.external_link ?? null,
      fields.project_lead ?? null,
      fields.project_lead_user_id ?? null,
      fields.created_at ?? now,
      fields.updated_at ?? fields.created_at ?? now,
      fields.deleted_at ?? null
    ]
  );
  return result.rows[0];
}

export async function insertTask(
  userId: string,
  projectId: string,
  fields: Partial<Pick<TaskDbRow, "status" | "title" | "deleted_at">> = {}
): Promise<TaskDbRow> {
  const result = await testDb().query<TaskDbRow>(
    `INSERT INTO tasks (user_id, project_id, status, title, deleted_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      userId,
      projectId,
      fields.status ?? "upcoming",
      fields.title ?? "Seeded task",
      fields.deleted_at ?? null
    ]
  );
  return result.rows[0];
}

export async function findProjectRow(id: string): Promise<ProjectDbRow | null> {
  const result = await testDb().query<ProjectDbRow>(
    "SELECT * FROM projects WHERE id = $1",
    [id]
  );
  return result.rows[0] ?? null;
}

export async function findTaskRows(projectId: string): Promise<TaskDbRow[]> {
  const result = await testDb().query<TaskDbRow>(
    "SELECT * FROM tasks WHERE project_id = $1 ORDER BY id",
    [projectId]
  );
  return result.rows;
}

export async function setUserDisplayName(
  userId: string,
  displayName: string
): Promise<void> {
  await testDb().query("UPDATE users SET display_name = $2 WHERE id = $1", [
    userId,
    displayName
  ]);
}
