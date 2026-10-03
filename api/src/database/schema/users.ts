import {
  pgEnum,
  pgTable,
  primaryKey,
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
    timeZone: varchar("time_zone", { length: 64 }).notNull()
  },
  (t) => [uniqueIndex("users_email_lower_key").on(sql`lower(${t.email})`)]
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
