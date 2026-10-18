// API shapes the prototype needs that `lib/api/schema` doesn't have yet (specs/04-web/prototype.md#mock-data-layer).
// Replaced by the generated types after the API task (`npm run api:types`). `PmspaPaths` lets the mock client
// type the new endpoints; `PmspaChangedPaths` names the ones whose generated shape it replaces.
import type {
  PmspaConnectionDto,
  PmspaDayDto,
  PmspaTaskDto,
  SyncCandidateDto,
  SyncPreviewDto,
  SyncPreviewItemDto,
  SyncResultDto
} from "./types";

/**
 * Proposed API-INT-007 item: one PMSPA day as PMSPA's range lookup answers it (date, start, event ids), so a
 * week is one PMSPA call. Its events, logged time and link state come from API-INT-018 when the day opens.
 */
export interface PmspaDaySummaryDto {
  /** `YYYY-MM-DD` */
  date: string;
  startMinute: number | null;
  /** Event ids PMSPA lists for the day; the opened day can show fewer (PMSPA drops ids of events it never saved). */
  eventCount: number;
}

/**
 * Proposed: API-INT-008 and API-INT-009 with `dates` also answer the selected days as API-INT-018 would (the
 * import's are as they stand after it), from the PMSPA reads they already make, so the Time tab shows them
 * without reading again. Absent without `dates`.
 */
export type PmspaImportPreviewDto = PmspaPreviewDto & { days?: PmspaDayDto[] };

/** A preview whose event rows may carry `taskPath` (an import's and a day push's) and lazy `candidates` (OQ-204). */
export type PmspaPreviewDto = Omit<SyncPreviewDto, "items"> & {
  items: PmspaPreviewItemDto[];
};

/**
 * Proposed: an import's or a day push's event row names the PMSPA project and task it sits under (a push: the
 * linked task, or the PM4 names it's created with), shown with their icons; its `detail` is then only the logs.
 * Absent on other rows and on an event without a task.
 *
 * OQ-204: `candidates` is null on a sync or push row whose PMSPA candidates weren't read for the preview: the
 * dialog fetches them (`POST /integrations/pmspa/candidates`) when the row's dropdown opens. An unlinked task
 * under a linked project in a project sync has them already (the preview read that project's tasks).
 */
export type PmspaPreviewItemDto = Omit<SyncPreviewItemDto, "candidates"> & {
  candidates: SyncCandidateDto[] | null;
  taskPath?: { projectTitle: string; taskTitle: string };
};

/**
 * Proposed API-INT-019 body (OQ-204): the PMSPA records a sync or push row can link to. `project`: the
 * account's PMSPA projects; `task`: the tasks of one PMSPA project. `for`: the PM4 projects or tasks the
 * candidates are compared with (the preview's rows of that type with `candidates: null`), so one PMSPA read
 * serves every such row.
 */
export type PmspaCandidatesInputDto =
  | { type: "project"; for: string[] }
  | { type: "task"; projectId: string; for: string[] };

/** Proposed API-INT-019 answer: per PM4 record of `for`, the PMSPA records not linked yet, same title first. */
export interface PmspaCandidatesDto {
  items: { pm4Id: string; candidates: SyncCandidateDto[] }[];
}
export type PmspaImportResultDto = SyncResultDto & { days?: PmspaDayDto[] };

/** Generated paths that `PmspaPaths` gives a new shape. */
export type PmspaChangedPaths =
  "/api/v1/integrations/pmspa/days" | "/api/v1/integrations/pmspa/candidates";

interface NoParams {
  query?: never;
  header?: never;
  path?: never;
  cookie?: never;
}

interface GetOnly<Query, Item> {
  parameters: NoParams;
  get: {
    parameters: Omit<NoParams, "query"> & { query: Query };
    requestBody?: never;
    responses: {
      200: {
        headers: { [name: string]: unknown };
        content: { "application/json": { items: Item[] } };
      };
    };
  };
  put?: never;
  post?: never;
  delete?: never;
  options?: never;
  head?: never;
  patch?: never;
  trace?: never;
}

interface PostOnly<Body, Answer> {
  parameters: NoParams;
  get?: never;
  put?: never;
  post: {
    parameters: NoParams;
    requestBody: { content: { "application/json": Body } };
    responses: {
      200: {
        headers: { [name: string]: unknown };
        content: { "application/json": Answer };
      };
    };
  };
  delete?: never;
  options?: never;
  head?: never;
  patch?: never;
  trace?: never;
}

export interface PmspaPaths {
  /** Proposed API-INT-019 (OQ-204): **Link to existing** candidates, read when a dropdown opens. */
  "/api/v1/integrations/pmspa/candidates": PostOnly<
    PmspaCandidatesInputDto,
    PmspaCandidatesDto
  >;
  /** Proposed API-INT-007: the week's days from one PMSPA range call, without their events. */
  "/api/v1/integrations/pmspa/days": GetOnly<
    { from: string; to: string },
    PmspaDaySummaryDto
  >;
  /**
   * Proposed API-INT-018: the given days (1 to 7) with their events and logs, each event's task and that task's
   * project. A task or project used on several of the days is read once. A date PMSPA has no events for is left out.
   */
  "/api/v1/integrations/pmspa/days/details": GetOnly<
    { dates: string[] },
    PmspaDayDto
  >;
  /** Proposed API-INT-017 `GET /integrations/pmspa/tasks`: every task of the connected account (OQ-201 (3)). */
  "/api/v1/integrations/pmspa/tasks": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: { [name: string]: unknown };
          content: { "application/json": { items: PmspaTaskDto[] } };
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}

/**
 * PMSPA's rate limit as its last answer reported it (`X-RateLimit-Limit`, `X-RateLimit-Remaining`,
 * `X-RateLimit-Reset`, or `Retry-After` on a 429). Per PMSPA host: every PM4 user calls PMSPA from the
 * API's one outbound IP, so they share it. Null when PM4 hasn't called PMSPA since the window last reset.
 */
export interface PmspaRateLimitDto {
  /** Requests allowed per window (100 on PMSPA). */
  limit: number;
  /** Requests left in the current window; 0 while PMSPA answers 429. */
  remaining: number;
  /** ISO 8601 UTC: when the window resets and `remaining` is back at `limit`. */
  resetAt: string;
  /** ISO 8601 UTC: the PMSPA answer these numbers come from. */
  observedAt: string;
}

/** Proposed: `PmspaConnectionResponseDto` gains `rateLimit`. */
export type PmspaConnectionWithRateLimitDto = PmspaConnectionDto & {
  rateLimit: PmspaRateLimitDto | null;
};
