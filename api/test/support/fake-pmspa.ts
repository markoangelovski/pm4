import { randomBytes } from "node:crypto";
import { isIP } from "node:net";

/** One PMSPA user account the fake can log in as. */
export interface FakePmspaAccount {
  /** A 24-hex ObjectId. */
  id: string;
  email: string;
  password: string;
  avatarUrl: string | null;
  role: "admin" | "user";
}

export interface FakePmspaCall {
  method: string;
  path: string;
  query: URLSearchParams;
  body: unknown;
}

const json = (
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers }
  });

/** PMSPA's answer to a missing, invalid or expired token on any route (cross-cutting 1.3). */
const tokenError = (name: "TokenExpiredError" | "JsonWebTokenError") =>
  json(500, {
    error: {
      name,
      message: name === "TokenExpiredError" ? "jwt expired" : "jwt malformed"
    }
  });

/**
 * An in-memory PMSPA behind `fetch` (feat-int-conn-api *Test doubles*), so no
 * e2e test talks to a real PMSPA. Use it with
 * `createTestApp([{ provide: PMSPA_FETCH, useValue: fake.fetch }, { provide: DNS_LOOKUP, useValue: fakeLookup }])`.
 *
 * Like PMSPA (docs-pmspa `users.login`, `users.checkAuth`): login answers
 * `{message, user}` with the token in header `X-Auth: Bearer <jwt>`; every
 * other route reads the token from the `auth` cookie (`Bearer%20<jwt>`) and
 * answers `500` with `error.name` for an invalid or expired one. Routes other
 * than login and who-am-I answer `404` until later features add them.
 */
export class FakePmspa {
  accounts: FakePmspaAccount[] = [];
  /** `fetch` rejects with `TypeError("fetch failed")`, and nothing is recorded. */
  unreachable = false;
  /** The next request answers `429` with this `Retry-After`. */
  rateLimitOnce: number | null = null;
  /** Every request that reached the fake, in order. */
  readonly calls: FakePmspaCall[] = [];
  /** Every token login issued, in order. */
  readonly issuedTokens: string[] = [];

  private readonly tokens = new Map<string, string>();
  private readonly expired = new Set<string>();

  /** Every token issued so far answers `500 {error: {name: "TokenExpiredError"}}`. */
  expireTokens(): void {
    for (const token of this.tokens.keys()) this.expired.add(token);
  }

  /** The requests to `method path` so far. */
  callsTo(method: string, path: string): FakePmspaCall[] {
    return this.calls.filter((c) => c.method === method && c.path === path);
  }

  readonly fetch: typeof globalThis.fetch = (input, init) => {
    if (this.unreachable) {
      return Promise.reject(new TypeError("fetch failed"));
    }
    const url = new URL(
      input instanceof Request ? input.url : input.toString()
    );
    const method = (init?.method ?? "GET").toUpperCase();
    const body: unknown =
      typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    this.calls.push({
      method,
      path: url.pathname,
      query: url.searchParams,
      body
    });
    return Promise.resolve(
      this.answer(method, url.pathname, new Headers(init?.headers), body)
    );
  };

  private answer(
    method: string,
    path: string,
    headers: Headers,
    body: unknown
  ): Response {
    if (this.rateLimitOnce !== null) {
      const seconds = this.rateLimitOnce;
      this.rateLimitOnce = null;
      return json(
        429,
        {
          error: "ERR_RATE_LIMIT_REACHED",
          message: "Rate limit reached, please try again later."
        },
        { "Retry-After": String(seconds) }
      );
    }

    const token = this.cookieToken(headers);
    if (token !== null) {
      if (this.expired.has(token)) return tokenError("TokenExpiredError");
      if (!this.tokens.has(token)) return tokenError("JsonWebTokenError");
    }

    if (method === "POST" && path === "/v1/auth/login") {
      return this.login(body);
    }
    if (method === "POST" && path === "/v1/auth") {
      const account =
        token === null ? undefined : this.accountById(this.tokens.get(token)!);
      if (!account) return tokenError("JsonWebTokenError");
      return json(200, { user: this.user(account) });
    }
    return json(404, { message: "Not found" });
  }

  private login(body: unknown): Response {
    const { email, password } = (body ?? {}) as {
      email?: unknown;
      password?: unknown;
    };
    if (typeof email !== "string" || typeof password !== "string") {
      return json(422, { message: "Unable to login" });
    }
    const account = this.accounts.find((a) => a.email === email);
    if (!account) return json(422, { message: "User not found!" });
    if (account.password !== password) {
      return json(409, { message: "Unable to login" });
    }
    const token = randomBytes(24).toString("base64url");
    this.tokens.set(token, account.id);
    this.issuedTokens.push(token);
    return json(
      200,
      { message: "Login successful", user: this.user(account) },
      {
        "X-Auth": `Bearer ${token}`,
        "Set-Cookie": `auth=Bearer%20${token}; Path=/; HttpOnly; Secure; SameSite=None`
      }
    );
  }

  private cookieToken(headers: Headers): string | null {
    const cookie = headers.get("cookie");
    if (!cookie) return null;
    for (const part of cookie.split(";")) {
      const [name, ...rest] = part.trim().split("=");
      if (name !== "auth") continue;
      const value = decodeURIComponent(rest.join("="));
      return value.startsWith("Bearer ")
        ? value.slice("Bearer ".length)
        : value;
    }
    return null;
  }

  private accountById(id: string): FakePmspaAccount | undefined {
    return this.accounts.find((a) => a.id === id);
  }

  private user(account: FakePmspaAccount) {
    return {
      _id: account.id,
      email: account.email,
      avatar_url: account.avatarUrl,
      role: account.role
    };
  }
}

const FAKE_HOSTS: Record<string, string> = {
  "pmspa.test": "203.0.113.10",
  "internal.test": "10.0.0.5"
};

/**
 * Stands in for `dns.promises.lookup(host, { all: true })`: `pmspa.test` is
 * public, `internal.test` private, an IP literal resolves to itself, and
 * anything else fails with `ENOTFOUND`.
 */
export function fakeLookup(
  host: string
): Promise<{ address: string; family: number }[]> {
  const bare = host.replace(/^\[|\]$/g, "");
  const family = isIP(bare);
  if (family !== 0) return Promise.resolve([{ address: bare, family }]);
  const address = FAKE_HOSTS[host.toLowerCase()];
  if (!address) {
    return Promise.reject(
      Object.assign(new Error(`getaddrinfo ENOTFOUND ${host}`), {
        code: "ENOTFOUND"
      })
    );
  }
  return Promise.resolve([{ address, family: 4 }]);
}
