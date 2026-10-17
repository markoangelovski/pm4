import { Injectable } from "@nestjs/common";
import type { PmspaAccountDto } from "./dto/pmspa-connection-response.dto.js";
import {
  PmspaConnectionRepository,
  type PmspaStatus
} from "./pmspa-connection.repository.js";
import { PmspaCrypto } from "./pmspa-crypto.js";
import { pmspaProblems } from "./pmspa-problems.js";
import { PmspaStore } from "./pmspa-store.js";
import {
  PmspaTransport,
  PmspaUnreachableError,
  type PmspaRequest,
  type PmspaResponse
} from "./pmspa-transport.js";

export type PmspaCheck =
  | { status: "connected"; token: string; account: PmspaAccountDto }
  | { status: "invalid-credentials" | "unreachable" };

const TOKEN_ERRORS = new Set(["TokenExpiredError", "JsonWebTokenError"]);

/** `avatar_url` only when https on images.unsplash.com (OQ-166). */
function safeAvatar(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "images.unsplash.com"
      ? value
      : null;
  } catch {
    return null;
  }
}

function isTokenError(res: PmspaResponse): boolean {
  if (res.status !== 500 || typeof res.body !== "object" || !res.body) {
    return false;
  }
  const body = res.body as { name?: unknown; error?: { name?: unknown } };
  const name = body.error?.name ?? body.name;
  return typeof name === "string" && TOKEN_ERRORS.has(name);
}

/**
 * The one PMSPA client every connector endpoint goes through: token cache,
 * one re-login, status updates (feat-int-conn-api D4).
 */
@Injectable()
export class PmspaClient {
  constructor(
    private readonly transport: PmspaTransport,
    private readonly store: PmspaStore,
    private readonly repo: PmspaConnectionRepository,
    private readonly crypto: PmspaCrypto
  ) {}

  /** Login + who-am-I, no cache. A rate limit throws. */
  async check(
    url: string,
    email: string,
    password: string
  ): Promise<PmspaCheck> {
    try {
      const login = await this.transport.send({
        method: "POST",
        baseUrl: url,
        path: "/v1/auth/login",
        body: { email, password }
      });
      if (login.status === 409 || login.status === 422) {
        return { status: "invalid-credentials" };
      }
      if (login.status >= 500) return { status: "unreachable" };
      const token = login.headers.get("X-Auth")?.replace(/^Bearer\s+/i, "");
      if (login.status !== 200 || !token) return { status: "unreachable" };

      const who = await this.transport.send({
        method: "POST",
        baseUrl: url,
        path: "/v1/auth",
        token
      });
      const user = (who.body as { user?: Record<string, unknown> } | null)
        ?.user;
      if (who.status !== 200 || !user || typeof user._id !== "string") {
        return { status: "unreachable" };
      }
      return {
        status: "connected",
        token,
        account: {
          id: user._id,
          email: typeof user.email === "string" ? user.email : email,
          avatarUrl: safeAvatar(user.avatar_url),
          role: user.role === "admin" ? "admin" : "user"
        }
      };
    } catch (e) {
      if (e instanceof PmspaUnreachableError) return { status: "unreachable" };
      throw e;
    }
  }

  /** An authenticated call for the user's saved connection (FR-INT-003). */
  async request(
    userId: string,
    req: Omit<PmspaRequest, "baseUrl" | "token">
  ): Promise<PmspaResponse> {
    const row = await this.repo.find(userId);
    if (!row) throw pmspaProblems.notConnected();
    let status: PmspaStatus = row.status;
    const setStatus = async (next: PmspaStatus) => {
      if (status !== next) {
        await this.repo.setStatus(userId, next);
        status = next;
      }
    };
    const invalid = async (): Promise<never> => {
      await setStatus("invalid-credentials");
      await this.store.clear(userId);
      throw pmspaProblems.invalidCredentials();
    };
    const login = async (): Promise<string> => {
      let password: string;
      try {
        password = this.crypto.decrypt(row.passwordEnc);
      } catch {
        return invalid();
      }
      const check = await this.check(row.url, row.email, password);
      if (check.status === "connected") {
        await this.store.setToken(userId, check.token);
        await this.store.setAccount(userId, check.account);
        return check.token;
      }
      if (check.status === "invalid-credentials") return invalid();
      await setStatus("unreachable");
      throw pmspaProblems.unreachable();
    };
    const send = (token: string) =>
      this.transport.send({ ...req, baseUrl: row.url, token });

    try {
      const token = (await this.store.getToken(userId)) ?? (await login());
      let res = await send(token);
      if (isTokenError(res)) {
        res = await send(await login());
      }
      await setStatus("connected");
      return res;
    } catch (e) {
      if (e instanceof PmspaUnreachableError) {
        await setStatus("unreachable");
        throw pmspaProblems.unreachable();
      }
      throw e;
    }
  }
}
