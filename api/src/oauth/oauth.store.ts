import { Injectable } from "@nestjs/common";
import { hashSecret, randomSecret } from "../auth/session.store.js";
import { AppConfigService } from "../config/app-config.service.js";
import { Redis } from "../redis/redis.js";
import type { ResolvedClient } from "./client-registry.js";
import type { GrantScope } from "./oauth-urls.js";

/** What `GET /oauth/authorize` stores for the consent page (API-MCP-004). */
export interface PendingRequest {
  clientId: string;
  clientName: string;
  clientIdHost: string;
  redirectUri: string;
  codeChallenge: string;
  scope: GrantScope;
  state: string | null;
  expiresAt: string;
}

/** The authorization code's payload (API-MCP-006). */
export interface AuthCode {
  grantId: string;
  userId: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scope: GrantScope;
}

/** `mcp:family:<grantId>` (security.md *Agent access*). */
export interface McpFamily {
  userId: string;
  clientId: string;
  current: string | null;
  lastUsedAt: string | null;
}

const CODE_TTL_SECONDS = 60;
const REQUEST_TTL_SECONDS = 3600;
const CIMD_TTL_SECONDS = 600;

const keys = {
  request: (id: string) => `oauth:request:${id}`,
  cimd: (url: string) => `oauth:cimd:${hashSecret(url)}`,
  code: (hash: string) => `oauth:code:${hash}`,
  refresh: (hash: string) => `mcp:refresh:${hash}`,
  rotated: (hash: string) => `mcp:rotated:${hash}`,
  family: (grantId: string) => `mcp:family:${grantId}`,
  revoked: (grantId: string) => `mcp:revoked:${grantId}`
};

const ROTATE_COMMAND = "pm4RotateMcpRefresh";
const FIRST_REFRESH_COMMAND = "pm4FirstMcpRefresh";

/**
 * Rotation of an MCP refresh token, atomic in Redis (copy of the web session's
 * script, plus the client check of D6).
 * KEYS: mcp:refresh:<h>, mcp:rotated:<h>, mcp:refresh:<new h>.
 * ARGV: h, new h, refresh TTL, client id, revoked TTL, now (ISO).
 * Returns `{ userId, grantId }`; nil when the token isn't live or belongs to
 * another client (nothing changes). A rotated (reused) token deletes its family.
 */
export const ROTATE_MCP_SCRIPT = `
local function decode(raw)
  if not raw then return nil end
  local ok, value = pcall(cjson.decode, raw)
  if ok and type(value) == 'table' then return value end
  return nil
end

local entry = decode(redis.call('GET', KEYS[1]))
if not entry then
  local reused = redis.call('GET', KEYS[2])
  if reused then
    local familyKey = 'mcp:family:' .. reused
    local family = decode(redis.call('GET', familyKey))
    if family then
      if type(family.current) == 'string' then
        redis.call('DEL', 'mcp:refresh:' .. family.current)
      end
      redis.call('DEL', familyKey)
      redis.call('SET', 'mcp:revoked:' .. reused, '1', 'EX', tonumber(ARGV[5]))
    end
  end
  return false
end

local userId, grantId = entry.userId, entry.grantId
if type(userId) ~= 'string' or type(grantId) ~= 'string' then return false end
local familyKey = 'mcp:family:' .. grantId
local family = decode(redis.call('GET', familyKey))
if not family or family.current ~= ARGV[1] then return false end
if family.clientId ~= ARGV[4] then return false end

local ttl = tonumber(ARGV[3])
redis.call('DEL', KEYS[1])
redis.call('SET', KEYS[3], cjson.encode({ userId = userId, grantId = grantId }), 'EX', ttl)
redis.call('SET', familyKey,
  cjson.encode({ userId = userId, clientId = family.clientId, current = ARGV[2], lastUsedAt = ARGV[6] }),
  'EX', ttl)
redis.call('SET', KEYS[2], grantId, 'EX', ttl)
return { userId, grantId }
`;

/**
 * Atomic first refresh token: sets the token and the family's `current` only
 * while the family exists, so a concurrent revoke can't be undone.
 */
export const FIRST_REFRESH_MCP_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return false end
local ok, family = pcall(cjson.decode, raw)
if not ok or type(family) ~= 'table' or type(family.userId) ~= 'string' then return false end
local ttl = tonumber(ARGV[3])
redis.call('SET', KEYS[2], cjson.encode({ grantId = ARGV[1], userId = family.userId }), 'EX', ttl)
redis.call('SET', KEYS[1],
  cjson.encode({ userId = family.userId, clientId = family.clientId, current = ARGV[2], lastUsedAt = ARGV[4] }),
  'EX', ttl)
return family.userId
`;

type FirstRefreshClient = Record<
  typeof FIRST_REFRESH_COMMAND,
  (
    familyKey: string,
    refreshKey: string,
    grantId: string,
    hash: string,
    ttlSeconds: number,
    nowIso: string
  ) => Promise<string | null>
>;

type RotateClient = Record<
  typeof ROTATE_COMMAND,
  (
    refreshKey: string,
    rotatedKey: string,
    newRefreshKey: string,
    hash: string,
    newHash: string,
    ttlSeconds: number,
    clientId: string,
    revokedTtlSeconds: number,
    nowIso: string
  ) => Promise<[string, string] | null>
>;

function parse<T>(raw: string | null): T | null {
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Redis state of the OAuth server (security.md *Agent access*, Redis keys). */
@Injectable()
export class OAuthStore {
  constructor(
    private readonly redis: Redis,
    private readonly config: AppConfigService
  ) {
    this.redis.client.defineCommand(ROTATE_COMMAND, {
      numberOfKeys: 3,
      lua: ROTATE_MCP_SCRIPT
    });
    this.redis.client.defineCommand(FIRST_REFRESH_COMMAND, {
      numberOfKeys: 2,
      lua: FIRST_REFRESH_MCP_SCRIPT
    });
  }

  private get client() {
    return this.redis.client;
  }

  async saveRequest(request: PendingRequest): Promise<string> {
    const id = randomSecret();
    await this.redis.client.set(
      keys.request(id),
      JSON.stringify(request),
      "EX",
      REQUEST_TTL_SECONDS
    );
    return id;
  }

  async getCachedClient(url: string): Promise<ResolvedClient | null> {
    const raw = await this.redis.client.get(keys.cimd(url));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as ResolvedClient;
    } catch {
      return null;
    }
  }

  async cacheClient(url: string, client: ResolvedClient): Promise<void> {
    await this.redis.client.set(
      keys.cimd(url),
      JSON.stringify(client),
      "EX",
      CIMD_TTL_SECONDS
    );
  }

  async getRequest(id: string): Promise<PendingRequest | null> {
    return parse<PendingRequest>(await this.client.get(keys.request(id)));
  }

  async takeRequest(id: string): Promise<PendingRequest | null> {
    return parse<PendingRequest>(await this.client.getdel(keys.request(id)));
  }

  async createCode(code: AuthCode): Promise<string> {
    const secret = randomSecret();
    await this.client.set(
      keys.code(hashSecret(secret)),
      JSON.stringify(code),
      "EX",
      CODE_TTL_SECONDS
    );
    return secret;
  }

  async takeCode(code: string): Promise<AuthCode | null> {
    return parse<AuthCode>(
      await this.client.getdel(keys.code(hashSecret(code)))
    );
  }

  async startFamily(
    grantId: string,
    userId: string,
    clientId: string
  ): Promise<void> {
    const family: McpFamily = {
      userId,
      clientId,
      current: null,
      lastUsedAt: null
    };
    await this.client.set(
      keys.family(grantId),
      JSON.stringify(family),
      "EX",
      this.config.refreshTokenTtlSeconds
    );
  }

  /** First refresh token of a code exchange; null = the family is gone. */
  async issueFirstRefresh(grantId: string): Promise<string | null> {
    const token = randomSecret();
    const hash = hashSecret(token);
    const userId = await (this.client as unknown as FirstRefreshClient)[
      FIRST_REFRESH_COMMAND
    ](
      keys.family(grantId),
      keys.refresh(hash),
      grantId,
      hash,
      this.config.refreshTokenTtlSeconds,
      new Date().toISOString()
    );
    return userId ? token : null;
  }

  /** Rotates a live token of `clientId`; see {@link ROTATE_MCP_SCRIPT}. */
  async rotate(
    token: string,
    clientId: string
  ): Promise<{ grantId: string; userId: string; refreshToken: string } | null> {
    const hash = hashSecret(token);
    const refreshToken = randomSecret();
    const newHash = hashSecret(refreshToken);
    const result = await (this.client as unknown as RotateClient)[
      ROTATE_COMMAND
    ](
      keys.refresh(hash),
      keys.rotated(hash),
      keys.refresh(newHash),
      hash,
      newHash,
      this.config.refreshTokenTtlSeconds,
      clientId,
      this.config.accessTokenTtlSeconds,
      new Date().toISOString()
    );
    if (!result) return null;
    const [userId, grantId] = result;
    return { grantId, userId, refreshToken };
  }

  /** The grant of a live or rotated refresh token. */
  async grantIdOfToken(token: string): Promise<string | null> {
    const hash = hashSecret(token);
    const entry = parse<{ grantId?: string }>(
      await this.client.get(keys.refresh(hash))
    );
    return entry?.grantId ?? (await this.client.get(keys.rotated(hash)));
  }

  async families(grantIds: string[]): Promise<(McpFamily | null)[]> {
    if (grantIds.length === 0) return [];
    const raws = await this.client.mget(...grantIds.map(keys.family));
    return raws.map((raw) => parse<McpFamily>(raw));
  }

  /** Deletes the family and its live token, and marks the grant revoked (D2). */
  async revokeGrant(grantId: string): Promise<void> {
    const family = parse<McpFamily>(
      await this.client.get(keys.family(grantId))
    );
    const multi = this.client.multi();
    if (family?.current) multi.del(keys.refresh(family.current));
    multi
      .del(keys.family(grantId))
      .set(keys.revoked(grantId), "1", "EX", this.config.accessTokenTtlSeconds);
    const results = await multi.exec();
    if (!results || results.some(([error]) => error)) {
      throw new Error("Redis transaction aborted");
    }
  }

  async isRevoked(grantId: string): Promise<boolean> {
    return (await this.client.exists(keys.revoked(grantId))) === 1;
  }
}
