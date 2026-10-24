import { index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";
import { projects, tasks } from "./projects.js";

/** A Markdown note (data-model.md *notes*). */
export const notes = pgTable(
  "notes",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null"
    }),
    taskId: uuid("task_id").references(() => tasks.id, {
      onDelete: "set null"
    }),
    title: varchar("title", { length: 200 }),
    body: varchar("body", { length: 10000 }).notNull(),
    deletedProjectTitle: varchar("deleted_project_title", { length: 200 }),
    deletedTaskTitle: varchar("deleted_task_title", { length: 200 })
  },
  (t) => [
    index("notes_user_updated").on(t.userId, t.updatedAt),
    index("notes_project")
      .on(t.projectId)
      .where(sql`${t.projectId} IS NOT NULL`),
    index("notes_task")
      .on(t.taskId)
      .where(sql`${t.taskId} IS NOT NULL`)
  ]
);

/** A to-do (data-model.md *todos*). */
export const todos = pgTable(
  "todos",
  {
    doneAt: timestamp("done_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null"
    }),
    taskId: uuid("task_id").references(() => tasks.id, {
      onDelete: "set null"
    }),
    text: varchar("text", { length: 500 }).notNull(),
    deletedProjectTitle: varchar("deleted_project_title", { length: 200 }),
    deletedTaskTitle: varchar("deleted_task_title", { length: 200 })
  },
  (t) => [
    index("todos_user").on(t.userId),
    index("todos_project")
      .on(t.projectId)
      .where(sql`${t.projectId} IS NOT NULL`),
    index("todos_task")
      .on(t.taskId)
      .where(sql`${t.taskId} IS NOT NULL`)
  ]
);

export type Note = typeof notes.$inferSelect;
export type Todo = typeof todos.$inferSelect;
