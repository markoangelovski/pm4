import {
  customType,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
import { projects, tasks } from "./projects.js";
import { timeLogs } from "./time.js";
import { users } from "./users.js";

/** A PMSPA ObjectId: 12 bytes in `bytea`, exchanged as 24 lowercase hex characters. */
export const objectId = customType<{ data: string; driverData: Buffer }>({
  dataType: () => "bytea",
  toDriver: (hex) => Buffer.from(hex, "hex"),
  fromDriver: (b) => b.toString("hex")
});

/** Raw binary (encrypted secrets, fingerprints). */
export const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea"
});

export const pmspaStatus = pgEnum("pmspa_status", [
  "connected",
  "invalid-credentials",
  "unreachable"
]);

export const pmspaLinkOrigin = pgEnum("pmspa_link_origin", [
  "imported",
  "pushed",
  "linked"
]);

export const pmspaConnections = pgTable("pmspa_connections", {
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }).notNull(),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  status: pmspaStatus("status").notNull(),
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  pmspaUserId: objectId("pmspa_user_id"),
  url: varchar("url", { length: 500 }).notNull(),
  email: varchar("email", { length: 254 }).notNull(),
  passwordEnc: bytea("password_enc").notNull()
});

export const pmspaProjectLinks = pgTable(
  "pmspa_project_links",
  {
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull(),
    origin: pmspaLinkOrigin("origin").notNull(),
    projectId: uuid("project_id")
      .primaryKey()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    pmspaUserId: objectId("pmspa_user_id").notNull(),
    pmspaId: objectId("pmspa_id").notNull(),
    pm4Hash: bytea("pm4_hash").notNull(),
    pmspaHash: bytea("pmspa_hash").notNull()
  },
  (t) => [
    uniqueIndex("pmspa_project_links_pmspa").on(
      t.userId,
      t.pmspaUserId,
      t.pmspaId
    )
  ]
);

export const pmspaTaskLinks = pgTable(
  "pmspa_task_links",
  {
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull(),
    origin: pmspaLinkOrigin("origin").notNull(),
    taskId: uuid("task_id")
      .primaryKey()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    pmspaUserId: objectId("pmspa_user_id").notNull(),
    pmspaId: objectId("pmspa_id").notNull(),
    pm4Hash: bytea("pm4_hash").notNull(),
    pmspaHash: bytea("pmspa_hash").notNull()
  },
  (t) => [
    uniqueIndex("pmspa_task_links_pmspa").on(t.userId, t.pmspaUserId, t.pmspaId)
  ]
);

export const pmspaLogLinks = pgTable(
  "pmspa_log_links",
  {
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull(),
    origin: pmspaLinkOrigin("origin").notNull(),
    timeLogId: uuid("time_log_id")
      .primaryKey()
      .references(() => timeLogs.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    pmspaUserId: objectId("pmspa_user_id").notNull(),
    pmspaId: objectId("pmspa_id").notNull(),
    pm4Hash: bytea("pm4_hash").notNull(),
    pmspaHash: bytea("pmspa_hash").notNull()
  },
  (t) => [
    uniqueIndex("pmspa_log_links_pmspa").on(t.userId, t.pmspaUserId, t.pmspaId)
  ]
);
