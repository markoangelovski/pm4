import { Inject, Injectable } from "@nestjs/common";
import { and, eq, ne, sql } from "drizzle-orm";
import { DRIZZLE, type DrizzleDb } from "../../database/drizzle.js";
import {
  pmspaConnections,
  pmspaLogLinks,
  pmspaProjectLinks,
  pmspaTaskLinks
} from "../../database/schema/integrations.js";
import type { PmspaOwner } from "./pmspa-store.js";

export type PmspaStatus = (typeof pmspaConnections.status.enumValues)[number];

export interface PmspaConnectionRow {
  userId: string;
  url: string;
  email: string;
  passwordEnc: Buffer;
  status: PmspaStatus;
  pmspaUserId: string | null;
  lastCheckedAt: Date;
  lastSyncAt: Date | null;
}

type Upsert = Omit<PmspaConnectionRow, "lastSyncAt">;

const linkTables = [pmspaProjectLinks, pmspaTaskLinks, pmspaLogLinks] as const;

/** Data access for `pmspa_connections` and the link tables. Scoped by `userId`. */
@Injectable()
export class PmspaConnectionRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async find(userId: string): Promise<PmspaConnectionRow | null> {
    const [row] = await this.db
      .select()
      .from(pmspaConnections)
      .where(eq(pmspaConnections.userId, userId))
      .limit(1);
    return row ?? null;
  }

  /** Inserts or replaces the connection; keeps `last_sync_at`. */
  async upsert(row: Upsert): Promise<PmspaConnectionRow> {
    return upsertRow(this.db, row);
  }

  /** Sets `last_sync_at` after an import or sync. */
  async setLastSyncAt(userId: string, at: Date): Promise<void> {
    await this.db
      .update(pmspaConnections)
      .set({ lastSyncAt: at })
      .where(eq(pmspaConnections.userId, userId));
  }

  /** Sets the status and `last_checked_at = now()`. */
  async setStatus(
    userId: string,
    status: PmspaStatus,
    pmspaUserId?: string
  ): Promise<void> {
    await this.db
      .update(pmspaConnections)
      .set({
        status,
        lastCheckedAt: new Date(),
        ...(pmspaUserId === undefined ? {} : { pmspaUserId })
      })
      .where(eq(pmspaConnections.userId, userId));
  }

  /** `setStatus` (status, `last_checked_at = now()`) only while the row still has `owner`'s URL and email; true when it did. */
  async setStatusFor(
    userId: string,
    owner: PmspaOwner,
    status: PmspaStatus
  ): Promise<boolean> {
    const rows = await this.db
      .update(pmspaConnections)
      .set({ status, lastCheckedAt: new Date() })
      .where(
        and(
          eq(pmspaConnections.userId, userId),
          eq(pmspaConnections.url, owner.url),
          eq(pmspaConnections.email, owner.email)
        )
      )
      .returning({ userId: pmspaConnections.userId });
    return rows.length > 0;
  }

  async delete(userId: string): Promise<void> {
    await this.db
      .delete(pmspaConnections)
      .where(eq(pmspaConnections.userId, userId));
  }

  /** Links of other accounts than `pmspaUserId` across the three link tables (FR-INT-002). */
  async countOtherAccountLinks(
    userId: string,
    pmspaUserId: string
  ): Promise<number> {
    let total = 0;
    for (const table of linkTables) {
      const [row] = await this.db
        .select({ n: sql<number>`count(*)::int` })
        .from(table)
        .where(
          and(eq(table.userId, userId), ne(table.pmspaUserId, pmspaUserId))
        );
      total += row?.n ?? 0;
    }
    return total;
  }

  /** One transaction: delete those links, then upsert the row. */
  async switchAccount(row: Upsert): Promise<PmspaConnectionRow> {
    return this.db.transaction(async (tx) => {
      for (const table of linkTables) {
        await tx
          .delete(table)
          .where(
            row.pmspaUserId === null
              ? eq(table.userId, row.userId)
              : and(
                  eq(table.userId, row.userId),
                  ne(table.pmspaUserId, row.pmspaUserId)
                )
          );
      }
      return upsertRow(tx, row);
    });
  }
}

async function upsertRow(
  db: Pick<DrizzleDb, "insert">,
  row: Upsert
): Promise<PmspaConnectionRow> {
  const [saved] = await db
    .insert(pmspaConnections)
    .values(row)
    .onConflictDoUpdate({
      target: pmspaConnections.userId,
      set: {
        url: row.url,
        email: row.email,
        passwordEnc: row.passwordEnc,
        status: row.status,
        pmspaUserId: row.pmspaUserId,
        lastCheckedAt: row.lastCheckedAt
      }
    })
    .returning();
  return saved;
}
