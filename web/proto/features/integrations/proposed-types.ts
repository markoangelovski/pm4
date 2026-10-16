// API shapes of the PMSPA connector (M6, req-integrations) that `lib/api/schema.d.ts` doesn't have yet.
// DTO-shaped and named like the future schema types; the feature spec's *API* section copies them. After the
// API task, `npm run api:types` replaces them. `PmspaPaths` lets the mock client type the new endpoints.

/** FR-INT-004 (OQ-142). */
export type PmspaConnectionStatus =
  "not-configured" | "connected" | "invalid-credentials" | "unreachable";

/**
 * The PMSPA account a connection logs in as (OQ-161): what PMSPA's login returns (`_id`, `email`,
 * `avatar_url`, `role`). PMSPA users have no name. Read from PMSPA on every check, not stored beyond the ID
 * and email (OQ-166).
 */
export interface PmspaAccountDto {
  id: string;
  email: string;
  /** An external image URL; null when PMSPA has none. */
  avatarUrl: string | null;
  role: "admin" | "user";
}

/** API-INT-001 `GET /integrations/pmspa`. Never holds the password or the token (FR-INT-003). */
export interface PmspaConnectionDto {
  status: PmspaConnectionStatus;
  /** Null while not configured. */
  url: string | null;
  email: string | null;
  /** The PMSPA account the last successful check logged in as (OQ-161). */
  account: PmspaAccountDto | null;
  lastCheckedAt: string | null;
  /** The last import or push (FR-INT-004). */
  lastSyncAt: string | null;
}

/** API-INT-002 `PUT /integrations/pmspa`. `password` omitted = keep the stored one (FR-INT-002). */
export interface SavePmspaConnectionDto {
  url: string;
  email: string;
  password?: string;
  /** Set after the "different PMSPA account" confirmation (409 `pmspa-account-switch`). */
  confirmAccountSwitch?: boolean;
}

/** The 409 problem's extension when the credentials log in as another PMSPA account and links exist (OQ-161). */
export interface PmspaAccountSwitchProblem {
  slug: "pmspa-account-switch";
  linkCount: number;
  accountEmail: string;
}

export type PmspaLinkType = "project" | "task" | "time-log";

/**
 * How a link was made (OQ-164): `imported` = the PM4 record was created from PMSPA, `pushed` = the PMSPA
 * record was created from PM4, `linked` = two existing records were paired (Link to existing). Later syncs
 * keep it.
 */
export type PmspaLinkOrigin = "imported" | "pushed" | "linked";

/** An active link (connection saved, same PMSPA account), as the sync flag needs it (FR-INT-010). */
export interface PmspaLinkDto {
  pm4Id: string;
  origin: PmspaLinkOrigin;
  syncedAt: string;
}

/** A PMSPA record's link to its PM4 record, on the connector page. */
export interface PmspaRecordLinkDto {
  pm4Id: string;
  pm4Title: string;
  origin: PmspaLinkOrigin;
  syncedAt: string;
}

/**
 * API-INT-014 `GET /integrations/pmspa/links/{type}/{id}`: one link with its PMSPA counterpart, read live
 * from PMSPA (nothing of it is stored, OQ-164). The edit dialog of a linked log asks for it once per opening.
 */
export interface PmspaLinkDetailDto {
  origin: PmspaLinkOrigin;
  syncedAt: string;
  /** The PMSPA record, read live and never stored (OQ-164, OQ-170). Null when it's gone. */
  pmspa: PmspaRecordDetail | null;
}

/** What the sync flag's popover shows of the PMSPA counterpart, by link type. */
export type PmspaRecordDetail =
  | {
      type: "project";
      title: string;
      /** PMSPA `pl`. */
      lead: string;
      done: boolean;
    }
  | {
      type: "task";
      title: string;
      projectTitle: string;
      column: PmspaColumn;
    }
  | {
      type: "time-log";
      /** The PMSPA log's title (PM4's log text). */
      title: string;
      eventTitle: string;
    };

/** API-INT-005 `GET /integrations/pmspa/projects` (read live from PMSPA, design principle 2). */
export interface PmspaProjectDto {
  id: string;
  title: string;
  done: boolean;
  taskCount: number;
  link: PmspaRecordLinkDto | null;
}

/** PMSPA kanban columns (`column`). */
export type PmspaColumn = "Upcoming" | "In Progress" | "Completed";

/** API-INT-006 `GET /integrations/pmspa/projects/{id}/tasks`. */
export interface PmspaTaskDto {
  id: string;
  projectId: string;
  title: string;
  column: PmspaColumn;
  link: PmspaRecordLinkDto | null;
}

export interface PmspaLogDto {
  id: string;
  title: string;
  durationMinutes: number;
  /** Linked to a PM4 time log (OQ-162). */
  linked: boolean;
}

export interface PmspaEventDto {
  id: string;
  title: string;
  /** The event's task and its project; PMSPA events have no project of their own. */
  task: { id: string; title: string; projectTitle: string } | null;
  booked: boolean;
  logs: PmspaLogDto[];
}

/** How many of a day's logs are linked to PM4 logs. */
export type PmspaDayLinkState = "linked" | "partly-linked" | "not-linked";

/** API-INT-007 `GET /integrations/pmspa/days?from=&to=`: PMSPA days with their events. */
export interface PmspaDayDto {
  date: string;
  /** Minutes after midnight (PMSPA `start` × 60). */
  startMinute: number | null;
  totalMinutes: number;
  linkState: PmspaDayLinkState;
  events: PmspaEventDto[];
}

/** What the user picked on the connector page (FR-INT-011). `taskIds: null` = all of the project's tasks. */
export interface PmspaImportSelectionDto {
  projects: { id: string; taskIds: string[] | null }[];
  dates: string[];
}

/** API-INT-015 `POST /integrations/pmspa/sync/preview` target (FR-INT-012): a project or task syncs both ways (OQ-172, OQ-173). */
export interface PmspaSyncTargetDto {
  type: "project" | "task";
  id: string;
}

/** API-INT-010 `POST /integrations/pmspa/push/preview` target: a day's logs go to PMSPA. `id` is the work date. */
export interface PmspaPushTargetDto {
  type: "day";
  id: string;
}

export type SyncRecordType = "project" | "task" | "day" | "event";
/**
 * `differs`: a linked project or task whose shared fields don't match (OQ-173); the user picks Link only,
 * Overwrite PMSPA or Overwrite PM4. `update` is for days and events.
 */
export type SyncAction = "create" | "update" | "skip" | "differs";
/**
 * OQ-172, OQ-173: the side a project or task row writes to. A row to create: where it's created. A row that
 * differs: the suggested side to overwrite (only PM4 changed since the last sync → `to-pmspa`, only PMSPA →
 * `to-pm4`), null when both or neither changed (Link only).
 */
export type SyncDirection = "to-pm4" | "to-pmspa";

/** One shared field whose values differ between a PM4 record and its PMSPA counterpart (OQ-173). */
export interface SyncFieldDiffDto {
  /** E.g. "Title", "Lead", "Due date". */
  field: string;
  /** Null when the side has no value. Text over PMSPA's limit is compared, and shown, as PMSPA would store it. */
  pm4: string | null;
  pmspa: string | null;
}

/** A record the user can link to instead of creating one (Link to existing, OQ-157). */
export interface SyncCandidateDto {
  id: string;
  title: string;
  /** For a task: its project on the same side, so the picker can follow the parent row's choice. */
  groupId: string | null;
  /** What tells it apart from the row's record (a project's lead, a task's column), e.g. "Lead Jane Doe". */
  detail: string | null;
  /** How it differs from the row's record, for the Link only / Overwrite choice (OQ-173). Empty = they match. */
  differences: SyncFieldDiffDto[];
}

/** One row of an import or push preview (design principle 6). */
export interface SyncPreviewItemDto {
  /** Stable within the preview, e.g. `project:66f1…`. */
  key: string;
  parentKey: string | null;
  type: SyncRecordType;
  title: string;
  /** A short line under the title, e.g. "3 events · 6h 15m". */
  detail: string | null;
  action: SyncAction;
  /** A project or task to create or update: where it's written (OQ-172). Null for days and events. */
  direction: SyncDirection | null;
  /** Why it's skipped, or why it's in the preview ("Parent of 2 tasks"). */
  reason: string | null;
  /** The linked counterpart's id on the other side (PM4 on import, PMSPA on push), or null. */
  linkedId: string | null;
  /** Brought in as a parent (design principle 5): can't be skipped while a child is included. */
  parent: boolean;
  /** A child the user may leave out (a project push's tasks, a project import's tasks). */
  optional: boolean;
  /** For an unlinked project or task: the other side's records of the same type (for a task, in the linked project). */
  candidates: SyncCandidateDto[];
  /** A linked project or task: the shared fields that differ (OQ-173). Empty unless `action` is `differs`. */
  differences: SyncFieldDiffDto[];
  /** Cut text and other notes (OQ-158, OQ-159). */
  warnings: string[];
}

export interface SyncPreviewDto {
  items: SyncPreviewItemDto[];
}

/**
 * The user's choice for one preview row (OQ-172, OQ-173). `link` pairs the row's record with `id` (a picked
 * candidate, or the linked counterpart of a row that differs) and overwrites the `overwrite` side, or nothing
 * (Link only). A row without a choice: `create`, or for a row that differs, `link` with its suggested direction.
 * `skip` leaves a row out.
 */
export type SyncChoiceDto =
  | { key: string; kind: "create" }
  | { key: string; kind: "link"; id: string; overwrite: SyncDirection | null }
  | { key: string; kind: "skip" };

export interface PmspaImportDto {
  selection: PmspaImportSelectionDto;
  choices: SyncChoiceDto[];
}

export interface PmspaSyncDto {
  target: PmspaSyncTargetDto;
  choices: SyncChoiceDto[];
}

export interface PmspaPushDto {
  target: PmspaPushTargetDto;
  choices: SyncChoiceDto[];
}

export type SyncOutcome =
  "created" | "updated" | "linked" | "skipped" | "failed";

/** Design principle 9: every record's outcome, a failure with PMSPA's reason. */
export interface SyncResultItemDto {
  key: string;
  parentKey: string | null;
  type: SyncRecordType;
  /** The title the preview showed. */
  title: string;
  /** The record's title after the write, when an overwrite changed it (shown as "old → new", OQ-174). */
  newTitle: string | null;
  outcome: SyncOutcome;
  reason: string | null;
}

export interface SyncResultDto {
  items: SyncResultItemDto[];
  syncedAt: string;
}

// ---- openapi-typescript-shaped paths for the mock client ----

type Json<T> = { content: { "application/json": T } };
type Res<T> = { 200: { headers: Record<string, unknown> } & Json<T> };
type NoContent = { 204: { headers: Record<string, unknown>; content?: never } };
type Params<Q = never, P = never> = ([Q] extends [never]
  ? { query?: never }
  : { query: Q }) &
  ([P] extends [never] ? { path?: never } : { path: P }) & {
    header?: never;
    cookie?: never;
  };
type Op<R, B = never, Q = never, P = never> = {
  parameters: Params<Q, P>;
  responses: R;
} & ([B] extends [never] ? { requestBody?: never } : { requestBody: Json<B> });
type PathItem = {
  parameters: {
    query?: never;
    header?: never;
    path?: never;
    cookie?: never;
  };
  get?: never;
  put?: never;
  post?: never;
  delete?: never;
  options?: never;
  head?: never;
  patch?: never;
  trace?: never;
};

export interface PmspaPaths {
  "/api/v1/integrations/pmspa": Omit<PathItem, "get" | "put" | "delete"> & {
    get: Op<Res<PmspaConnectionDto>>;
    put: Op<Res<PmspaConnectionDto>, SavePmspaConnectionDto>;
    delete: Op<NoContent>;
  };
  "/api/v1/integrations/pmspa/test": Omit<PathItem, "post"> & {
    post: Op<Res<PmspaConnectionDto>>;
  };
  "/api/v1/integrations/pmspa/links": Omit<PathItem, "get"> & {
    get: Op<Res<{ items: PmspaLinkDto[] }>, never, { type: PmspaLinkType }>;
  };
  "/api/v1/integrations/pmspa/links/{type}/{id}": Omit<
    PathItem,
    "get" | "delete"
  > & {
    get: Op<
      Res<PmspaLinkDetailDto>,
      never,
      never,
      { type: PmspaLinkType; id: string }
    >;
    delete: Op<NoContent, never, never, { type: PmspaLinkType; id: string }>;
  };
  "/api/v1/integrations/pmspa/projects": Omit<PathItem, "get"> & {
    get: Op<Res<{ items: PmspaProjectDto[] }>>;
  };
  "/api/v1/integrations/pmspa/projects/{id}/tasks": Omit<PathItem, "get"> & {
    get: Op<Res<{ items: PmspaTaskDto[] }>, never, never, { id: string }>;
  };
  "/api/v1/integrations/pmspa/days": Omit<PathItem, "get"> & {
    get: Op<Res<{ items: PmspaDayDto[] }>, never, { from: string; to: string }>;
  };
  "/api/v1/integrations/pmspa/import/preview": Omit<PathItem, "post"> & {
    post: Op<Res<SyncPreviewDto>, PmspaImportSelectionDto>;
  };
  "/api/v1/integrations/pmspa/import": Omit<PathItem, "post"> & {
    post: Op<Res<SyncResultDto>, PmspaImportDto>;
  };
  "/api/v1/integrations/pmspa/sync/preview": Omit<PathItem, "post"> & {
    post: Op<Res<SyncPreviewDto>, PmspaSyncTargetDto>;
  };
  "/api/v1/integrations/pmspa/sync": Omit<PathItem, "post"> & {
    post: Op<Res<SyncResultDto>, PmspaSyncDto>;
  };
  "/api/v1/integrations/pmspa/push/preview": Omit<PathItem, "post"> & {
    post: Op<Res<SyncPreviewDto>, PmspaPushTargetDto>;
  };
  "/api/v1/integrations/pmspa/push": Omit<PathItem, "post"> & {
    post: Op<Res<SyncResultDto>, PmspaPushDto>;
  };
}
