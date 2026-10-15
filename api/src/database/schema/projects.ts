import {
  date,
  index,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";

export const taskStatus = pgEnum("task_status", [
  "upcoming",
  "in-progress",
  "completed"
]);

export const projects = pgTable(
  "projects",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectLeadUserId: uuid("project_lead_user_id").references(() => users.id, {
      onDelete: "set null"
    }),
    title: varchar("title", { length: 200 }).notNull(),
    description: varchar("description", { length: 2000 }),
    externalLink: varchar("external_link", { length: 500 }),
    projectLead: varchar("project_lead", { length: 100 })
  },
  (t) => [index("projects_user_id_idx").on(t.userId)]
);

export const tasks = pgTable(
  "tasks",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    dueDate: date("due_date", { mode: "string" }),
    status: taskStatus("status").notNull().default("upcoming"),
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    projectLeadUserId: uuid("project_lead_user_id").references(() => users.id, {
      onDelete: "set null"
    }),
    title: varchar("title", { length: 200 }).notNull(),
    description: varchar("description", { length: 2000 }),
    externalLink: varchar("external_link", { length: 500 }),
    projectLead: varchar("project_lead", { length: 100 })
  },
  (t) => [
    index("tasks_project_id_idx").on(t.projectId),
    index("tasks_user_id_status_idx").on(t.userId, t.status)
  ]
);

export type Project = typeof projects.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type TaskStatus = (typeof taskStatus.enumValues)[number];
