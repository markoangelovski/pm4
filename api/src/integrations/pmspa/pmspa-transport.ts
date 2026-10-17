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
      await this.store.pause(host, seconds);
      throw pmspaProblems.rateLimited(seconds);
    }

    let body: unknown;
    try {
      const text = await res.text();
      body = text ? (JSON.parse(text) as unknown) : null;
    } catch {
      body = null;
    }
    return { status: res.status, headers: res.headers, body };
  }

  private log(req: PmspaRequest, status: number | string, started: number) {
    this.logger.log(
      `${req.method} ${req.path} ${status} ${Date.now() - started}ms`
    );
  }
}
