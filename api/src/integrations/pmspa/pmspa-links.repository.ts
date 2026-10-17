import { Inject, Injectable } from "@nestjs/common";
import { and, eq, ne } from "drizzle-orm";
import { DRIZZLE, type DrizzleDb } from "../../database/drizzle.js";
import {
  pmspaLinkOrigin,
  pmspaLogLinks,
  pmspaProjectLinks,
  pmspaTaskLinks
} from "../../database/schema/integrations.js";

export type PmspaLinkType = "project" | "task" | "time-log";
export type PmspaLinkOrigin = (typeof pmspaLinkOrigin.enumValues)[number];

/** One active or inactive link of any of the three link tables. */
export interface LinkRow {
  type: PmspaLinkType;
  pm4Id: string;
  pmspaId: string;
  pmspaUserId: string;
  origin: PmspaLinkOrigin;
  syncedAt: Date;
  pm4Hash: Buffer;
  pmspaHash: Buffer;
}

/** The link table of each type and its PM4 id column. */
const LINKS = {
  project: { table: pmspaProjectLinks, pm4Id: pmspaProjectLinks.projectId },
  task: { table: pmspaTaskLinks, pm4Id: pmspaTaskLinks.taskId },
  "time-log": { table: pmspaLogLinks, pm4Id: pmspaLogLinks.timeLogId }
} as const;

/** Input of `save`: the link's PM4 record, its PMSPA record and both hashes. */
export type LinkSave = Omit<LinkRow, "syncedAt" | "origin"> & {
  syncedAt: Date;
  origin: PmspaLinkOrigin;
};

/** Data access for the three link tables (`pmspa_*_links`). Every method is scoped by `userId`. */
@Injectable()
export class PmspaLinksRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  /** The user's links of `type` whose PMSPA account is `pmspaUserId`. */
  async active(
    userId: string,
    pmspaUserId: string,
    type: PmspaLinkType
  ): Promise<LinkRow[]> {
    const { table, pm4Id } = LINKS[type];
    const rows = await this.db
      .select({
        pm4Id,
        pmspaId: table.pmspaId,
        pmspaUserId: table.pmspaUserId,
        origin: table.origin,
        syncedAt: table.syncedAt,
        pm4Hash: table.pm4Hash,
        pmspaHash: table.pmspaHash
      })
      .from(table)
      .where(and(eq(table.userId, userId), eq(table.pmspaUserId, pmspaUserId)));
    return rows.map((row) => ({ ...row, type }));
  }

  /** The link of the PM4 record `pm4Id`, of any PMSPA account. */
  async byPm4(
    userId: string,
    type: PmspaLinkType,
    pm4Id: string
  ): Promise<LinkRow | null> {
    const { table, pm4Id: pm4Column } = LINKS[type];
    const [row] = await this.db
      .select({
        pm4Id: pm4Column,
        pmspaId: table.pmspaId,
        pmspaUserId: table.pmspaUserId,
        origin: table.origin,
        syncedAt: table.syncedAt,
        pm4Hash: table.pm4Hash,
        pmspaHash: table.pmspaHash
      })
      .from(table)
      .where(and(eq(table.userId, userId), eq(pm4Column, pm4Id)))
      .limit(1);
    return row ? { ...row, type } : null;
  }

  /** The link of the PMSPA record `pmspaId` of account `pmspaUserId`. */
  async byPmspa(
    userId: string,
    pmspaUserId: string,
    type: PmspaLinkType,
    pmspaId: string
  ): Promise<LinkRow | null> {
    const { table, pm4Id } = LINKS[type];
    const [row] = await this.db
      .select({
        pm4Id,
        pmspaId: table.pmspaId,
        pmspaUserId: table.pmspaUserId,
        origin: table.origin,
        syncedAt: table.syncedAt,
        pm4Hash: table.pm4Hash,
        pmspaHash: table.pmspaHash
      })
      .from(table)
      .where(
        and(
          eq(table.userId, userId),
          eq(table.pmspaUserId, pmspaUserId),
          eq(table.pmspaId, pmspaId)
        )
      )
      .limit(1);
    return row ? { ...row, type } : null;
  }

  /**
   * Inserts the link, or updates the row of this PM4 id. First deletes another row with the same
   * (user, account, pmspaId): a PMSPA record has one PM4 link. Keeps an existing origin.
   */
  async save(userId: string, row: LinkSave): Promise<void> {
    await this.db.transaction(async (tx) => {
      switch (row.type) {
        case "project":
          await tx
            .delete(pmspaProjectLinks)
            .where(
              and(
                eq(pmspaProjectLinks.userId, userId),
                eq(pmspaProjectLinks.pmspaUserId, row.pmspaUserId),
                eq(pmspaProjectLinks.pmspaId, row.pmspaId),
                ne(pmspaProjectLinks.projectId, row.pm4Id)
              )
            );
          await tx
            .insert(pmspaProjectLinks)
            .values({
              projectId: row.pm4Id,
              userId,
              pmspaUserId: row.pmspaUserId,
              pmspaId: row.pmspaId,
              origin: row.origin,
              syncedAt: row.syncedAt,
              pm4Hash: row.pm4Hash,
              pmspaHash: row.pmspaHash
            })
            .onConflictDoUpdate({
              target: pmspaProjectLinks.projectId,
              set: {
                pmspaUserId: row.pmspaUserId,
                pmspaId: row.pmspaId,
                syncedAt: row.syncedAt,
                pm4Hash: row.pm4Hash,
                pmspaHash: row.pmspaHash
              }
            });
          return;
        case "task":
          await tx
            .delete(pmspaTaskLinks)
            .where(
              and(
                eq(pmspaTaskLinks.userId, userId),
                eq(pmspaTaskLinks.pmspaUserId, row.pmspaUserId),
                eq(pmspaTaskLinks.pmspaId, row.pmspaId),
                ne(pmspaTaskLinks.taskId, row.pm4Id)
              )
            );
          await tx
            .insert(pmspaTaskLinks)
            .values({
              taskId: row.pm4Id,
              userId,
              pmspaUserId: row.pmspaUserId,
              pmspaId: row.pmspaId,
              origin: row.origin,
              syncedAt: row.syncedAt,
              pm4Hash: row.pm4Hash,
              pmspaHash: row.pmspaHash
            })
            .onConflictDoUpdate({
              target: pmspaTaskLinks.taskId,
              set: {
                pmspaUserId: row.pmspaUserId,
                pmspaId: row.pmspaId,
                syncedAt: row.syncedAt,
                pm4Hash: row.pm4Hash,
                pmspaHash: row.pmspaHash
              }
            });
          return;
        case "time-log":
          await tx
            .delete(pmspaLogLinks)
            .where(
              and(
                eq(pmspaLogLinks.userId, userId),
                eq(pmspaLogLinks.pmspaUserId, row.pmspaUserId),
                eq(pmspaLogLinks.pmspaId, row.pmspaId),
                ne(pmspaLogLinks.timeLogId, row.pm4Id)
              )
            );
          await tx
            .insert(pmspaLogLinks)
            .values({
              timeLogId: row.pm4Id,
              userId,
              pmspaUserId: row.pmspaUserId,
              pmspaId: row.pmspaId,
              origin: row.origin,
              syncedAt: row.syncedAt,
              pm4Hash: row.pm4Hash,
              pmspaHash: row.pmspaHash
            })
            .onConflictDoUpdate({
              target: pmspaLogLinks.timeLogId,
              set: {
                pmspaUserId: row.pmspaUserId,
                pmspaId: row.pmspaId,
                syncedAt: row.syncedAt,
                pm4Hash: row.pm4Hash,
                pmspaHash: row.pmspaHash
              }
            });
          return;
      }
    });
  }

  /** Deletes the link of the PM4 record `pm4Id` (any account). `false` = no such link. */
  async delete(
    userId: string,
    type: PmspaLinkType,
    pm4Id: string
  ): Promise<boolean> {
    const { table, pm4Id: pm4Column } = LINKS[type];
    const deleted = await this.db
      .delete(table)
      .where(and(eq(table.userId, userId), eq(pm4Column, pm4Id)))
      .returning({ id: pm4Column });
    return deleted.length > 0;
  }
}
