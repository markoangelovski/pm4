import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { ChainableCommander } from "ioredis";
import { AppConfigService } from "../config/app-config.service.js";
import { Redis } from "../redis/redis.js";

/** What `GET /auth/google` stores for the callback (security.md step 2). */
export interface OAuthState {
  codeVerifier: string;
  returnTo: string | null;
  timeZone: string | null;
}

interface RefreshEntry {
  userId: string;
  familyId: string;
}

interface FamilyEntry {
  userId: string;
  current: string;
}

const STATE_TTL_SECONDS = 600;
const LOGIN_CODE_TTL_SECONDS = 60;

/** `h(x)`: sha256 hex. Tokens and codes are never stored in clear. */
export function hashSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** 32 random bytes, base64url (43 chars): tokens, codes, state, PKCE verifier. */
export function randomSecret(): string {
  return randomBytes(32).toString("base64url");
}

const keys = {
  state: (state: string) => `oauth:state:${state}`,
  code: (hash: string) => `auth:code:${hash}`,
  refresh: (hash: string) => `auth:refresh:${hash}`,
  family: (familyId: string) => `auth:family:${familyId}`,
  rotated: (hash: string) => `auth:rotated:${hash}`,
  families: (userId: string) => `auth:families:${userId}`
};

/** `exec()` resolves even when a queued command failed: surface that. */
async function execOrThrow(multi: ChainableCommander): Promise<void> {
  const results = await multi.exec();
  if (!results) throw new Error("Redis transaction aborted");
  const failed = results.find(([error]) => error);
  if (failed) throw failed[0]!;
}

export const ROTATE_COMMAND = "pm4RotateRefresh";

/**
 * Refresh-token rotation with reuse detection, atomic in Redis
 * (feat-auth-api-session *Session store*).
 * KEYS: auth:refresh:<h>, auth:rotated:<h>, auth:refresh:<new h>.
 * ARGV: h, new h, refresh TTL in seconds.
 * Returns `{ userId, familyId }`, or nil when the token isn't live; a
 * rotated (reused) token first revokes its family. Family and set keys
 * derive from stored ids, as in `keys` above.
 */
export const ROTATE_SCRIPT = `
local function decode(raw)
  if not raw then return nil end
  local ok, value = pcall(cjson.decode, raw)
  if ok and type(value) == 'table' then return value end
  return nil
end

local entry = decode(redis.call('GETDEL', KEYS[1]))
if not entry then
  local reused = redis.call('GET', KEYS[2])
  if reused then
    local familyKey = 'auth:family:' .. reused
    local family = decode(redis.call('GET', familyKey))
    if family then
      if type(family.current) == 'string' then
        redis.call('DEL', 'auth:refresh:' .. family.current)
      end
      redis.call('DEL', familyKey)
      if type(family.userId) == 'string' then
        redis.call('SREM', 'auth:families:' .. family.userId, reused)
      end
    end
  end
  return false
end

local userId, familyId = entry.userId, entry.familyId
if type(userId) ~= 'string' or type(familyId) ~= 'string' then
  return false
end
local familyKey = 'auth:family:' .. familyId
local family = decode(redis.call('GET', familyKey))
if not family or family.current ~= ARGV[1] then return false end

local ttl = tonumber(ARGV[3])
redis.call('SET', KEYS[3],
  cjson.encode({ userId = userId, familyId = familyId }), 'EX', ttl)
redis.call('SET', familyKey,
  cjson.encode({ userId = userId, current = ARGV[2] }), 'EX', ttl)
redis.call('SET', KEYS[2], familyId, 'EX', ttl)
local setKey = 'auth:families:' .. userId
redis.call('SADD', setKey, familyId)
redis.call('EXPIRE', setKey, ttl)
return { userId, familyId }
`;

/** The ioredis client with {@link ROTATE_SCRIPT} defined on it. */
type RotateClient = Record<
  typeof ROTATE_COMMAND,
  (
    refreshKey: string,
    rotatedKey: string,
    newRefreshKey: string,
    hash: string,
    newHash: string,
    ttlSeconds: number
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

/**
 * Redis-backed OAuth state, login codes and refresh-token families
 * (security.md *Authentication flow*, feat-auth-api-session *Session store*).
 * `rotate` is one Lua script; other multi-key writes go in one MULTI.
 */
@Injectable()
export class SessionStore {
  constructor(
    private readonly redis: Redis,
    private readonly config: AppConfigService
  ) {
    // Idempotent per client: ioredis keeps one definition per command name.
    this.client.defineCommand(ROTATE_COMMAND, {
      numberOfKeys: 3,
      lua: ROTATE_SCRIPT
    });
  }

  private get client() {
    return this.redis.client;
  }

  private get refreshTtl(): number {
    return this.config.refreshTokenTtlSeconds;
  }

  async saveState(state: string, entry: OAuthState): Promise<void> {
    await this.client.set(
      keys.state(state),
      JSON.stringify(entry),
      "EX",
      STATE_TTL_SECONDS
    );
  }

  /** Reads and deletes the state entry (single use). */
  async takeState(state: string): Promise<OAuthState | null> {
    return parse<OAuthState>(await this.client.getdel(keys.state(state)));
  }

  async createLoginCode(userId: string): Promise<string> {
    const code = randomSecret();
    await this.client.set(
      keys.code(hashSecret(code)),
      userId,
      "EX",
      LOGIN_CODE_TTL_SECONDS
    );
    return code;
  }

  /** Consumes a login code (single use) → its user id. */
  takeLoginCode(code: string): Promise<string | null> {
    return this.client.getdel(keys.code(hashSecret(code)));
  }

  /** Starts a new session (family) and returns its first refresh token. */
  async startFamily(userId: string): Promise<string> {
    const familyId = randomUUID();
    const token = randomSecret();
    const hash = hashSecret(token);
    await execOrThrow(
      this.client
        .multi()
        .set(
          keys.refresh(hash),
          JSON.stringify({ userId, familyId } satisfies RefreshEntry),
          "EX",
          this.refreshTtl
        )
        .set(
          keys.family(familyId),
          JSON.stringify({ userId, current: hash } satisfies FamilyEntry),
          "EX",
          this.refreshTtl
        )
        .sadd(keys.families(userId), familyId)
        .expire(keys.families(userId), this.refreshTtl)
    );
    return token;
  }

  /**
   * Rotates a live refresh token. A token that was already rotated revokes
   * its whole family (reuse detection). `null` = not a valid live token.
   * One Lua script ({@link ROTATE_SCRIPT}), so Redis runs it atomically.
   */
  async rotate(token: string): Promise<{
    userId: string;
    familyId: string;
    refreshToken: string;
  } | null> {
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
      this.refreshTtl
    );
    if (!result) return null;
    const [userId, familyId] = result;
    return { userId, familyId, refreshToken };
  }

  /** Deletes the family's live token, the family and its entry in the user's set. */
  async revokeFamily(familyId: string): Promise<void> {
    await this.revokeExistingFamily(familyId);
  }

  /** `revokeFamily`; `false` when the family no longer exists. */
  private async revokeExistingFamily(familyId: string): Promise<boolean> {
    const family = parse<FamilyEntry>(
      await this.client.get(keys.family(familyId))
    );
    if (!family) return false;
    await execOrThrow(
      this.client
        .multi()
        .del(keys.refresh(family.current))
        .del(keys.family(familyId))
        .srem(keys.families(family.userId), familyId)
    );
    return true;
  }

  /** Revokes the family of a live or rotated token; an unknown token is a no-op. */
  async revokeByToken(token: string): Promise<void> {
    const hash = hashSecret(token);
    const entry = parse<RefreshEntry>(
      await this.client.get(keys.refresh(hash))
    );
    const familyId =
      entry?.familyId ?? (await this.client.get(keys.rotated(hash)));
    if (familyId) await this.revokeFamily(familyId);
  }

  /**
   * Revokes every family in the user's set. The set itself is never deleted,
   * so a session started concurrently stays listed; ids of families that
   * already expired are removed from it.
   */
  async revokeAll(userId: string): Promise<void> {
    const familyIds = await this.client.smembers(keys.families(userId));
    for (const familyId of familyIds) {
      if (!(await this.revokeExistingFamily(familyId))) {
        await this.client.srem(keys.families(userId), familyId);
      }
    }
  }
}
