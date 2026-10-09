import {
  check,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  index
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const authProvider = pgEnum("auth_provider", ["google"]);

export const users = pgTable(
  "users",
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
    email: varchar("email", { length: 254 }).notNull(),
    displayName: varchar("display_name", { length: 100 }).notNull(),
    avatarUrl: varchar("avatar_url", { length: 500 }),
    timeZone: varchar("time_zone", { length: 64 }).notNull(),
    dailyTargetMinutes: smallint("daily_target_minutes").notNull().default(420)
  },
  (t) => [
    uniqueIndex("users_email_lower_key").on(sql`lower(${t.email})`),
    check(
      "users_daily_target_minutes",
      sql`${t.dailyTargetMinutes} BETWEEN 15 AND 1440 AND ${t.dailyTargetMinutes} % 15 = 0`
    )
  ]
);

export const userIdentities = pgTable(
  "user_identities",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    provider: authProvider("provider").notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
  },
  (t) => [
    primaryKey({ columns: [t.provider, t.subject] }),
    index("user_identities_user_id_idx").on(t.userId)
  ]
);

export type User = typeof users.$inferSelect;
