import { Injectable } from "@nestjs/common";
import type { ConnectedAppDto } from "./dto/connected-app.dto.js";
import { GrantsRepository } from "./grants.repository.js";
import { OAuthStore } from "./oauth.store.js";
import { scopeList } from "./oauth-urls.js";

/** CIMD client: the `client_id` URL's host; DCR client: its first redirect URI's host. */
function clientIdHost(clientId: string, redirectUris?: string[]): string {
  try {
    if (/^https?:\/\//i.test(clientId)) return new URL(clientId).host;
    return new URL(redirectUris?.[0] ?? "").host;
  } catch {
    return "";
  }
}

@Injectable()
export class GrantsService {
  constructor(
    private readonly grants: GrantsRepository,
    private readonly store: OAuthStore
  ) {}

  /** Deletes the user's grant and revokes it in Redis; false = not found. */
  async deleteGrant(userId: string, grantId: string): Promise<boolean> {
    const deleted = await this.grants.deleteGrant(userId, grantId);
    if (!deleted) return false;
    await this.store.revokeGrant(grantId);
    return true;
  }

  /** The user's grants, newest first, with their last use from Redis. */
  async list(userId: string): Promise<ConnectedAppDto[]> {
    const rows = await this.grants.listGrants(userId);
    if (rows.length === 0) return [];
    const [families, clients] = await Promise.all([
      this.store.families(rows.map((row) => row.id)),
      this.grants.findClients(rows.map((row) => row.clientId))
    ]);
    return rows.map((row, index) => {
      const family = families[index];
      return {
        id: row.id,
        logoUri: row.logoUri,
        client: {
          name: row.clientName,
          clientIdHost: clientIdHost(
            row.clientId,
            clients.get(row.clientId)?.redirectUris
          )
        },
        scopes: scopeList(row.scope),
        connectedAt: row.createdAt.toISOString(),
        lastUsedAt: family?.lastUsedAt ?? null,
        expired: family === null
      };
    });
  }

  /** Sign out of all devices: deletes every grant and revokes each in Redis. */
  async revokeAll(userId: string): Promise<void> {
    const ids = await this.grants.deleteAllGrants(userId);
    for (const id of ids) await this.store.revokeGrant(id);
  }

  /** Account deletion: marks every grant revoked; the rows go by cascade. */
  async markAllRevoked(userId: string): Promise<void> {
    const ids = await this.grants.grantIds(userId);
    for (const id of ids) await this.store.revokeGrant(id);
  }
}
