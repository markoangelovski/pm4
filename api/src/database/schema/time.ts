import {
  boolean,
  check,
  date,
  index,
  pgTable,
  primaryKey,
  smallint,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";
import { projects, tasks } from "./projects.js";

/** A user's workday: its start time, one row per date with a start (data-model.md *workdays*). */
export const workdays = pgTable(
  "workdays",
  {
    workDate: date("work_date", { mode: "string" }).notNull(),
    startMinute: smallint("start_minute").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.workDate] }),
    check(
      "workdays_start_minute",
      sql`${t.startMinute} BETWEEN 0 AND 1425 AND ${t.startMinute} % 15 = 0`
    )
  ]
);

/** One block of logged work (data-model.md *time_logs*). */
export const timeLogs = pgTable(
  "time_logs",
  {
    workDate: date("work_date", { mode: "string" }).notNull(),
    durationMinutes: smallint("duration_minutes").notNull(),
    excludeFromStats: boolean("exclude_from_stats").notNull().default(false),
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    taskId: uuid("task_id").references(() => tasks.id, {
      onDelete: "set null"
    }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null"
    }),
    text: varchar("text", { length: 1000 }).notNull(),
    title: varchar("title", { length: 100 }),
    deletedTaskTitle: varchar("deleted_task_title", { length: 200 }),
    deletedProjectTitle: varchar("deleted_project_title", { length: 200 })
  },
  (t) => [
    index("time_logs_user_date").on(t.userId, t.workDate, t.id),
    index("time_logs_task")
      .on(t.taskId)
      .where(sql`${t.taskId} IS NOT NULL`),
    index("time_logs_project")
      .on(t.projectId)
      .where(sql`${t.projectId} IS NOT NULL`),
    check(
      "time_logs_duration",
      sql`${t.durationMinutes} BETWEEN 15 AND 1440 AND ${t.durationMinutes} % 15 = 0`
    )
  ]
);

/** Part of a log's time booked to a date (data-model.md *bookings*). */
export const bookings = pgTable(
  "bookings",
  {
    bookingDate: date("booking_date", { mode: "string" }).notNull(),
    minutes: smallint("minutes").notNull(),
    timeLogId: uuid("time_log_id")
      .notNull()
      .references(() => timeLogs.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
  },
  (t) => [
    primaryKey({ columns: [t.timeLogId, t.bookingDate] }),
    index("bookings_user_date").on(t.userId, t.bookingDate),
    check(
      "bookings_minutes",
      sql`${t.minutes} BETWEEN 15 AND 1440 AND ${t.minutes} % 15 = 0`
    )
  ]
);

export type Workday = typeof workdays.$inferSelect;
export type TimeLog = typeof timeLogs.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
