import { Inject, Injectable, Logger } from "@nestjs/common";
import { PmspaHostGuard } from "./pmspa-host-guard.js";
import { pmspaProblems } from "./pmspa-problems.js";
import { PmspaStore } from "./pmspa-store.js";

export interface PmspaRequest {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  baseUrl: string;
  /** Starts with `/v1/`. */
  path: string;
  query?: Record<string, string>;
  token?: string;
  body?: unknown;
}

export interface PmspaResponse {
  status: number;
  headers: Headers;
  /** Parsed JSON, or null. */
  body: unknown;
}

/** Timeout, DNS, connection, a redirect or a private address. */
export class PmspaUnreachableError extends Error {}

/** DI token for the `fetch` every PMSPA call uses (overridden in e2e tests). */
export const PMSPA_FETCH = Symbol("PMSPA_FETCH");

const TIMEOUT_MS = 60_000;
const DEFAULT_PAUSE_SECONDS = 900;

/**
 * The one place that calls PMSPA over HTTP (feat-int-conn-api D3): the
 * shared rate-limit pause, the SSRF guard, a timeout and no redirects.
 */
@Injectable()
export class PmspaTransport {
  private readonly logger = new Logger(PmspaTransport.name);

  constructor(
    private readonly guard: PmspaHostGuard,
    private readonly store: PmspaStore,
    @Inject(PMSPA_FETCH) private readonly fetchFn: typeof globalThis.fetch
  ) {}

  async send(req: PmspaRequest): Promise<PmspaResponse> {
    let host: string;
    try {
      host = new URL(req.baseUrl).host.toLowerCase();
    } catch {
      throw new PmspaUnreachableError("invalid PMSPA url");
    }
    const paused = await this.store.pausedFor(host);
    if (paused > 0) throw pmspaProblems.rateLimited(paused);
    if ((await this.guard.check(req.baseUrl)) !== "ok") {
      throw new PmspaUnreachableError("PMSPA host not allowed");
    }

    const query = req.query ? new URLSearchParams(req.query).toString() : "";
    const url =
      req.baseUrl.replace(/\/+$/, "") + req.path + (query ? `?${query}` : "");
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json"
    };
    if (req.token !== undefined) headers.Cookie = `auth=Bearer%20${req.token}`;

    const started = Date.now();
    let res: Response;
    try {
      res = await this.fetchFn(url, {
        method: req.method,
        headers,
        body: req.body === undefined ? undefined : JSON.stringify(req.body),
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });
    } catch {
      this.log(req, "error", started);
      throw new PmspaUnreachableError("PMSPA request failed");
    }
    this.log(req, res.status, started);

    if (res.status >= 300 && res.status < 400) {
      throw new PmspaUnreachableError("PMSPA answered with a redirect");
    }
    if (res.status === 429) {
      const header = Number(res.headers.get("Retry-After"));
      const seconds =
        Number.isFinite(header) && header > 0
          ? Math.ceil(header)
          : DEFAULT_PAUSE_SECONDS;
      // Paused first, so an answer that overlapped this one is stored as spent (D1).
      await this.store.pause(host, seconds);
      await this.observe(host, res);
      throw pmspaProblems.rateLimited(seconds);
    }
    await this.observe(host, res);

    let body: unknown;
    try {
      const text = await res.text();
      body = text ? (JSON.parse(text) as unknown) : null;
    } catch {
      body = null;
    }
    return { status: res.status, headers: res.headers, body };
  }

  /**
   * Keeps PMSPA's X-RateLimit-* of this answer for every PM4 user on the host
   * (feat-int-budget D1, OQ-200). A failure to store it is only logged.
   */
  private async observe(host: string, res: Response): Promise<void> {
    const int = (name: string): number | null => {
      const raw = res.headers.get(name)?.trim();
      return raw && /^\d+$/.test(raw) ? Number(raw) : null;
    };
    const now = Date.now();
    let limit = int("X-RateLimit-Limit");
    let remaining = int("X-RateLimit-Remaining");
    const reset = int("X-RateLimit-Reset");
    const retry = int("Retry-After");
    let resetAt = reset === null ? null : reset * 1000;
    const limited = res.status === 429;
    if (limited) {
      remaining = 0;
      resetAt = Math.max(
        resetAt ?? 0,
        now + (retry ?? DEFAULT_PAUSE_SECONDS) * 1000
      );
    }
    try {
      if (limited && limit === null) {
        limit = (await this.store.getRateLimit(host))?.limit ?? null;
      }
      if (
        limit === null ||
        limit === 0 ||
        remaining === null ||
        resetAt === null ||
        resetAt <= now
      ) {
        return;
      }
      await this.store.setRateLimit(host, {
        limit,
        remaining: Math.min(remaining, limit),
        resetAt: new Date(resetAt).toISOString(),
        observedAt: new Date(now).toISOString()
      });
    } catch {
      this.logger.warn(`Couldn't keep the PMSPA rate limit for ${host}.`);
    }
  }

  private log(req: PmspaRequest, status: number | string, started: number) {
    this.logger.log(
      `${req.method} ${req.path} ${status} ${Date.now() - started}ms`
    );
  }
}
