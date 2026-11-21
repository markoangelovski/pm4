import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, inArray, lt, notExists, sql } from "drizzle-orm";
import { DRIZZLE, type DrizzleDb } from "../database/drizzle.js";
import { oauthClients, oauthGrants } from "../database/schema/oauth.js";

import type { GrantScope } from "./oauth-urls.js";

export interface GrantRow {
  id: string;
  userId: string;
  clientId: string;
  clientName: string;
  logoUri: string | null;
  scope: GrantScope;
  createdAt: Date;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CLIENT_RETENTION_DAYS = 30;

@Injectable()
export class GrantsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  /** A DCR client by id; a non-UUID id is null. */
  async findClient(id: string): Promise<{
    id: string;
    name: string;
    redirectUris: string[];
    logoUri: string | null;
    createdAt: Date;
  } | null> {
    if (!UUID.test(id)) return null;
    const [row] = await this.db
      .select()
      .from(oauthClients)
      .where(eq(oauthClients.id, id))
      .limit(1);
    if (!row) return null;
    return {
      id: row.id,
      name: row.clientName,
      redirectUris: row.redirectUris,
      logoUri: row.logoUri,
      createdAt: row.createdAt
    };
  }

  /** One transaction: delete clients created > 30 days ago that no grant names, then insert (API-MCP-003). */
  registerClient(
    name: string,
    redirectUris: string[],
    logoUri: string | null
  ): Promise<{ id: string; createdAt: Date }> {
    return this.db.transaction(async (tx) => {
      await tx.delete(oauthClients).where(
        and(
          lt(
            oauthClients.createdAt,
            sql`now() - make_interval(days => ${CLIENT_RETENTION_DAYS})`
          ),
          notExists(
            tx
              .select({ one: sql`1` })
              .from(oauthGrants)
              .where(sql`${oauthGrants.clientId} = ${oauthClients.id}::text`)
          )
        )
      );
      const [row] = await tx
        .insert(oauthClients)
        .values({ clientName: name, redirectUris, logoUri })
        .returning({ id: oauthClients.id, createdAt: oauthClients.createdAt });
      return row;
    });
  }

  async findGrant(userId: string, clientId: string): Promise<GrantRow | null> {
    const [row] = await this.db
      .select()
      .from(oauthGrants)
      .where(
        and(eq(oauthGrants.userId, userId), eq(oauthGrants.clientId, clientId))
      )
      .limit(1);
    return row ?? null;
  }

  /** A non-UUID id is null. */
  async findGrantById(id: string): Promise<GrantRow | null> {
    if (!UUID.test(id)) return null;
    const [row] = await this.db
      .select()
      .from(oauthGrants)
      .where(eq(oauthGrants.id, id))
      .limit(1);
    return row ?? null;
  }

  /** One transaction: delete the user's grant for the client, insert the new one (D5). */
  replaceGrant(
    userId: string,
    clientId: string,
    clientName: string,
    logoUri: string | null,
    scope: GrantScope
  ): Promise<{ grant: GrantRow; replacedId: string | null }> {
    return this.db.transaction(async (tx) => {
      const [replaced] = await tx
        .delete(oauthGrants)
        .where(
          and(
            eq(oauthGrants.userId, userId),
            eq(oauthGrants.clientId, clientId)
          )
        )
        .returning({ id: oauthGrants.id });
      const [grant] = await tx
        .insert(oauthGrants)
        .values({ userId, clientId, clientName, logoUri, scope })
        .returning();
      return { grant, replacedId: replaced?.id ?? null };
    });
  }

  async deleteGrant(userId: string, id: string): Promise<boolean> {
    if (!UUID.test(id)) return false;
    const rows = await this.db
      .delete(oauthGrants)
      .where(and(eq(oauthGrants.id, id), eq(oauthGrants.userId, userId)))
      .returning({ id: oauthGrants.id });
    return rows.length > 0;
  }

  async listGrants(userId: string): Promise<GrantRow[]> {
    return this.db
      .select()
      .from(oauthGrants)
      .where(eq(oauthGrants.userId, userId))
      .orderBy(desc(oauthGrants.createdAt), desc(oauthGrants.id));
  }

  async deleteAllGrants(userId: string): Promise<string[]> {
    const rows = await this.db
      .delete(oauthGrants)
      .where(eq(oauthGrants.userId, userId))
      .returning({ id: oauthGrants.id });
    return rows.map((row) => row.id);
  }

  async grantIds(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: oauthGrants.id })
      .from(oauthGrants)
      .where(eq(oauthGrants.userId, userId));
    return rows.map((row) => row.id);
  }

  /** DCR clients by id (non-UUID ids, i.e. CIMD URLs, are skipped). */
  async findClients(
    ids: string[]
  ): Promise<Map<string, { redirectUris: string[] }>> {
    const uuids = ids.filter((id) => UUID.test(id));
    if (uuids.length === 0) return new Map();
    const rows = await this.db
      .select({ id: oauthClients.id, redirectUris: oauthClients.redirectUris })
      .from(oauthClients)
      .where(inArray(oauthClients.id, uuids));
    return new Map(
      rows.map((row) => [row.id, { redirectUris: row.redirectUris }])
    );
  }
}
