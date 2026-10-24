import { testDb } from "./auth-test-utils.js";

// Seeds `notes` and `todos` rows directly (feat-note-todos), with given timestamps, so
// the sort and range tests don't depend on the clock. Rows go away with their user
// (`ON DELETE cascade`), so `deleteTestUsers()` cleans them up.

export interface NoteDbRow {
  id: string;
  user_id: string;
  project_id: string | null;
  task_id: string | null;
  title: string | null;
  body: string;
  created_at: Date;
  updated_at: Date;
}

export interface TodoDbRow {
  id: string;
  user_id: string;
  project_id: string | null;
  task_id: string | null;
  text: string;
  done_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

type Link = { project_id?: string | null; task_id?: string | null };

export async function insertNote(
  userId: string,
  fields: Partial<
    Pick<NoteDbRow, "title" | "body" | "created_at" | "updated_at">
  > &
    Link = {}
): Promise<NoteDbRow> {
  const now = new Date();
  const result = await testDb().query<NoteDbRow>(
    `INSERT INTO notes (user_id, project_id, task_id, title, body, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      userId,
      fields.project_id ?? null,
      fields.task_id ?? null,
      fields.title ?? null,
      fields.body ?? "Seeded note",
      fields.created_at ?? now,
      fields.updated_at ?? fields.created_at ?? now
    ]
  );
  return result.rows[0];
}

export async function insertTodo(
  userId: string,
  fields: Partial<
    Pick<TodoDbRow, "text" | "done_at" | "created_at" | "updated_at">
  > &
    Link = {}
): Promise<TodoDbRow> {
  const now = new Date();
  const result = await testDb().query<TodoDbRow>(
    `INSERT INTO todos (user_id, project_id, task_id, text, done_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      userId,
      fields.project_id ?? null,
      fields.task_id ?? null,
      fields.text ?? "Seeded to-do",
      fields.done_at ?? null,
      fields.created_at ?? now,
      fields.updated_at ?? fields.created_at ?? now
    ]
  );
  return result.rows[0];
}
