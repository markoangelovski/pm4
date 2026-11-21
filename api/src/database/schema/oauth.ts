import {
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";

/** The scope a grant stores (`pm4:write` includes read, OQ-289). */
export const oauthScope = pgEnum("oauth_scope", ["read", "write"]);

/** Apps registered through Dynamic Client Registration (API-MCP-003, OQ-290). */
export const oauthClients = pgTable("oauth_clients", {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  id: uuid("id")
    .primaryKey()
    .default(sql`uuidv7()`),
  clientName: varchar("client_name", { length: 100 }).notNull(),
  redirectUris: varchar("redirect_uris", { length: 2000 }).array().notNull()
});

/** One user's approval of one app (FR-MCP-005, FR-MCP-009). */
export const oauthGrants = pgTable(
  "oauth_grants",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    scope: oauthScope("scope").notNull(),
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: varchar("client_id", { length: 2048 }).notNull(),
    clientName: varchar("client_name", { length: 100 }).notNull()
  },
  (table) => [
    uniqueIndex("oauth_grants_user_client_uq").on(table.userId, table.clientId)
  ]
);
