// Mock PMSPA of the UI prototype: the remote PMSPA account's data, the user's connection, the links, and the
// import / push engine behind `/api/v1/integrations/pmspa/**` (req-integrations). Module state: resets on reload.
// Logins: `mock.user@pmspa.example` (account A, the links' account) or `other.user@pmspa.example` (account B),
// any password except "wrong"; a URL containing "down" is unreachable.
import { addDays, format } from "date-fns";
import type { components } from "@/lib/api/schema";
import { formatDuration, formatWorkDate, today } from "@/lib/time";
import type {
  PmspaAccountSwitchProblem,
  PmspaCandidatesInputDto,
  PmspaColumn,
  PmspaConnectionDto,
  PmspaConnectionStatus,
  PmspaDaySummaryDto,
  PmspaDayDto,
  PmspaImportSelectionDto,
  PmspaLinkDetailDto,
  PmspaLinkOrigin,
  PmspaLinkType,
  PmspaProjectDto,
  PmspaPushTargetDto,
  PmspaRateLimitDto,
  PmspaRecordLinkDto,
  PmspaSyncTargetDto,
  PmspaTaskDto,
  SavePmspaConnectionDto,
  SyncCandidateDto,
  SyncChoiceDto,
  SyncDirection,
  SyncFieldDiffDto,
  SyncPreviewItemDto,
  SyncResultDto,
  SyncResultItemDto
} from "@/proto/features/integrations/types";
import type { TimeLog } from "@/proto/features/time/types";
import { MOCK_TZ } from "./seed";
import { getMockState, mock, nextId } from "./store";

import type { Project } from "@/proto/features/projects/api";
import type { Task } from "@/proto/features/tasks/api";
type Status = components["schemas"]["TaskStatus"];

interface RemoteProject {
  id: string;
  userId: string;
  title: string;
  description: string;
  pl: string;
  kanboard: string;
  done: boolean;
}
interface RemoteTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  column: PmspaColumn;
  pl: string;
  kanboard: string;
  /** PMSPA always has one (epoch ms; the creation time by default, OQ-159). */
  dueDate: string;
}
interface RemoteLog {
  id: string;
  title: string;
  /** PMSPA hours. */
  duration: number;
}
interface RemoteEvent {
  id: string;
  date: string;
  title: string;
  taskId: string | null;
  booked: boolean;
  logs: RemoteLog[];
}
interface Link {
  type: PmspaLinkType;
  pm4Id: string;
  pmspaId: string;
  /** The PMSPA account the link was made with (OQ-161, OQ-162). */
  pmspaUserId: string;
  origin: PmspaLinkOrigin;
  syncedAt: string;
  /**
   * Changed since the last sync: PM4's `updated_at` after `synced_at`, PMSPA's fingerprint unlike the stored one
   * (design principle 7). For a project or task they only pick the suggested side (OQ-173); the rows themselves
   * come from comparing the fields.
   */
  pm4Changed: boolean;
  pmspaChanged: boolean;
}
interface Connection {
  url: string;
  email: string;
  password: string;
  status: Exclude<PmspaConnectionStatus, "not-configured">;
  accountId: string | null;
  lastCheckedAt: string;
}

/** What PMSPA's login returns per account (`_id`, `email`, `avatar_url`, `role`). */
const ACCOUNTS = [
  {
    id: "a0000000000000000000000a",
    email: "mock.user@pmspa.example",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=faces",
    role: "admin" as const
  },
  {
    id: "b0000000000000000000000b",
    email: "other.user@pmspa.example",
    // A dead avatar URL: the initials show instead.
    avatarUrl: "https://source.unsplash.com/150x150?face",
    role: "user" as const
  }
];
const A = ACCOUNTS[0].id;

const todayStr = today(MOCK_TZ);
const ago = (n: number) =>
  format(addDays(new Date(todayStr + "T12:00:00"), -n), "yyyy-MM-dd");
/** A local date and time in the mock user's zone (the browser's) as an ISO instant. */
const at = (date: string, time: string) =>
  new Date(`${date}T${time}:00`).toISOString();
let oidSeq = 0x100;
/** A 24-hex PMSPA ObjectId: its first 4 bytes are the creation second (OQ-207). */
const oid = (createdAt = Date.now()) =>
  Math.floor(createdAt / 1000)
    .toString(16)
    .padStart(8, "0") +
  "e4b0" +
  (oidSeq++).toString(16).padStart(12, "0");
/** OQ-207: when PMSPA created a record, from its ObjectId (what the API derives from a link's `pmspa_id`). */
const createdAtOf = (pmspaId: string) =>
  new Date(parseInt(pmspaId.slice(0, 8), 16) * 1000).toISOString();

const LONG_TITLE =
  "Internal tooling and automation for the operations team, including the reporting pipeline, the invoicing exports and the onboarding checklists";

function seedRemote() {
  // Seeded projects and tasks were created in PMSPA days to years ago, a few days apart.
  let seedDaysAgo = 900;
  const seedTime = () => Date.now() - (seedDaysAgo -= 3) * 86_400_000;
  const p = (
    title: string,
    extra: Partial<RemoteProject> = {}
  ): RemoteProject => ({
    id: oid(seedTime()),
    userId: A,
    title,
    description: "",
    pl: "Mock User",
    kanboard: "",
    done: false,
    ...extra
  });
  const anthropic = p("Anthropic");
  const nvidia = p("Nvidia");
  const acme = p("Acme Website Relaunch", {
    description: "New marketing site: design, build and launch.",
    pl: "Jane Doe",
    kanboard: "https://kanboard.example.com/project/42"
  });
  // Its description was added in PMSPA since the last sync: Overwrite PM4 is suggested (OQ-173).
  const tesla = p("Tesla", { description: "QA retainer." });
  const tooling = p(LONG_TITLE);
  const archive = p("Archive 2025", { done: true });
  // OQ-206: enough tasks that Expand all reads one project's lists rather than all tasks when a search narrows the list.
  const support = p("Support desk", { description: "Client support tickets." });
  const t = (
    project: RemoteProject,
    title: string,
    column: PmspaColumn = "Upcoming",
    extra: Partial<RemoteTask> = {}
  ): RemoteTask => ({
    id: oid(seedTime()),
    projectId: project.id,
    title,
    description: "",
    column,
    pl: "Mock User",
    kanboard: "",
    dueDate: ago(30),
    ...extra
  });
  const tasks = [
    t(anthropic, "PM"),
    // Renamed and described in PMSPA, edited in PM4 too: no side is suggested (OQ-173).
    t(anthropic, "Meetings & demos", "In Progress", {
      description: "Client calls and demos.",
      dueDate: format(addDays(new Date(), 1), "yyyy-MM-dd")
    }),
    t(anthropic, "Model eval dashboard"),
    t(nvidia, "PM", "In Progress"),
    t(nvidia, "Development", "In Progress"),
    t(nvidia, "Release 4.2 rollout"),
    t(acme, "Homepage redesign", "In Progress"),
    t(acme, "SEO audit", "Completed"),
    t(acme, "Launch checklist"),
    t(acme, "Content migration"),
    t(acme, "Analytics setup"),
    t(tesla, "Meetings", "In Progress"),
    t(tesla, "QA", "In Progress"),
    t(tesla, "Regression suite for the charging app", "Completed"),
    t(archive, "Wrap-up", "Completed"),
    ...Array.from({ length: 120 }, (_, i) =>
      t(support, `Ticket #${1001 + i}`, i < 110 ? "Completed" : "In Progress")
    )
  ];
  const task = (projectId: string, title: string) =>
    tasks.find((x) => x.projectId === projectId && x.title === title)!;
  const ev = (
    date: string,
    title: string,
    taskId: string | null,
    logs: [string, number][],
    booked = false
  ): RemoteEvent => {
    // Logged in PMSPA on its day (OQ-207: a log's id carries that time).
    const loggedAt = new Date(`${date}T17:00:00`).getTime();
    return {
      id: oid(loggedAt),
      date,
      title,
      taskId,
      booked,
      logs: logs.map(([title, duration]) => ({
        id: oid(loggedAt),
        title,
        duration
      }))
    };
  };
  const events = [
    // Day 2 was pushed from PM4 earlier: its Meetings log sits in PMSPA's PM event (moved in PM4 since).
    ev(ago(2), "Anthropic", task(anthropic.id, "PM").id, [
      ["Weekly meetings and follow-ups.", 2.25]
    ]),
    ev(
      ago(1),
      "Release 4.2 rollout",
      task(nvidia.id, "Release 4.2 rollout").id,
      [
        ["Rollout plan with the release team.", 1.5],
        ["Smoke tests on staging.", 0.75]
      ]
    ),
    ev(ago(1), "Homepage redesign", task(acme.id, "Homepage redesign").id, [
      ["Wireframes review with the client.", 1.5]
    ]),
    ev(ago(3), "Internal", null, [["Team retro and planning.", 1]]),
    ev(
      ago(3),
      "Meetings",
      task(tesla.id, "Meetings").id,
      [["Weekly with the Tesla team.", 0.5]],
      true
    ),
    ev(ago(4), "Development", task(nvidia.id, "Development").id, [
      ["Import pipeline fixes.", 2],
      ["Hotfix review.", 0.3]
    ]),
    // OQ-197: logs the import can't take, warned about in the preview.
    ev(ago(5), "Ticket #1115", task(support.id, "Ticket #1115").id, [
      ["Call logged twice by mistake.", 0],
      ["Overnight migration watch.", 25],
      [
        "Pasted the whole support thread here: " +
          "The customer reports that the export stops halfway. ".repeat(20),
        1
      ],
      ["Reproduced and fixed the export.", 1.5]
    ]),
    ev(ago(8), "SEO audit", task(acme.id, "SEO audit").id, [
      ["Crawl report and fixes list.", 3]
    ])
  ];
  const starts: Record<string, number> = {
    [ago(1)]: 9 * 60,
    [ago(2)]: 8 * 60 + 30,
    [ago(3)]: 8 * 60,
    [ago(4)]: 9 * 60 + 15,
    [ago(8)]: 9 * 60
  };
  const synced = at(ago(1), "22:50");
  const link = (
    type: PmspaLinkType,
    pm4Id: string,
    pmspaId: string,
    origin: PmspaLinkOrigin,
    changed: Partial<Pick<Link, "pm4Changed" | "pmspaChanged">> = {}
  ): Link => ({
    type,
    pm4Id,
    pmspaId,
    pmspaUserId: A,
    origin,
    syncedAt: synced,
    pm4Changed: false,
    pmspaChanged: false,
    ...changed
  });
  const links = [
    link("project", "p-anthropic", anthropic.id, "imported"),
    link("project", "p-tesla", tesla.id, "linked", { pmspaChanged: true }),
    link("task", "t-anthropic-pm", task(anthropic.id, "PM").id, "imported"),
    // Changed on both sides since the last sync (FR-INT-008, OQ-173).
    link(
      "task",
      "t-anthropic-meet",
      task(anthropic.id, "Meetings & demos").id,
      "pushed",
      {
        pm4Changed: true,
        pmspaChanged: true
      }
    ),
    link("task", "t-tesla-meet", task(tesla.id, "Meetings").id, "linked"),
    // l21 (day 2, Anthropic Meetings) is linked to the log in PMSPA's PM event: moved to Meetings in PM4.
    link("time-log", "l21", events[0].logs[0].id, "pushed", {
      pm4Changed: true
    })
  ];
  // Today's first three logs, one per origin, so the day view shows every log tag (OQ-164). Their PMSPA
  // events follow the task's link; the "linked" one has its own PMSPA text, as two records paired later would.
  const todays = getMockState()
    .logs.filter((l) => l.workDate === todayStr)
    .slice(0, 3);
  const origins: PmspaLinkOrigin[] = ["imported", "pushed", "linked"];
  const todayEvents = new Map<string, RemoteEvent>();
  todays.forEach((l, i) => {
    const taskLink = links.find(
      (x) => x.type === "task" && x.pm4Id === l.task?.id
    );
    // OQ-167 (the seed's titles are all 3+ characters, so no " · Time").
    const title = l.project?.title ?? (l.title || "Unsorted");
    const key = l.task?.id ?? l.project?.id ?? `unsorted:${title}`;
    const e =
      todayEvents.get(key) ??
      ev(todayStr, title, taskLink?.pmspaId ?? null, []);
    todayEvents.set(key, e);
    const pmspaLog = {
      id: oid(),
      title:
        origins[i] === "linked"
          ? "Sync with the team, notes in Confluence."
          : l.text.slice(0, 350),
      duration: l.durationMinutes / 60
    };
    e.logs.push(pmspaLog);
    links.push(link("time-log", l.id, pmspaLog.id, origins[i]));
  });
  events.push(...todayEvents.values());
  starts[todayStr] = 8 * 60;
  return {
    projects: [anthropic, nvidia, acme, tesla, tooling, archive, support],
    tasks,
    events,
    starts,
    links
  };
}

let remote = seedRemote();
let connection: Connection | null = {
  url: "https://pmspa.example.com",
  email: ACCOUNTS[0].email,
  password: "secret",
  status: "connected",
  accountId: A,
  lastCheckedAt: at(todayStr, "08:05")
};
let lastSyncAt: string | null = at(ago(1), "22:50");

// ---------- connection (API-INT-001…004) ----------

export function connectionDto(): PmspaConnectionDto {
  if (!connection)
    return {
      status: "not-configured",
      url: null,
      email: null,
      account: null,
      lastCheckedAt: null,
      lastSyncAt: null,
      rateLimit: null
    };
  const account = ACCOUNTS.find((a) => a.id === connection!.accountId);
  return {
    status: connection.status,
    url: connection.url,
    email: connection.email,
    account: account ?? null,
    lastCheckedAt: connection.lastCheckedAt,
    lastSyncAt,
    rateLimit: rateLimitDto()
  };
}

/** `POST /v1/auth/login` + `POST /v1/auth` against the mock accounts. */
function login(url: string, email: string, password: string) {
  if (url.includes("down")) return { status: "unreachable" as const };
  const account = ACCOUNTS.find((a) => a.email === email.toLowerCase());
  if (!account || password === "wrong")
    return { status: "invalid-credentials" as const };
  return { status: "connected" as const, accountId: account.id };
}

/** The URL rule (FR-INT-002, OQ-145, OQ-160); the prototype acts as the `development` environment. */
export function urlProblem(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return "Enter a full URL starting with https://.";
  }
  const local = ["localhost", "127.0.0.1"].includes(u.hostname);
  if (u.protocol === "http:" && local) return null;
  if (u.protocol !== "https:") return "The URL must start with https://.";
  if (
    local ||
    /^(10|127|169\.254|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(u.hostname)
  )
    return "This address is private or local, so PM4 can't connect to it.";
  return null;
}

/** API-INT-002. Returns the 409 problem when the login is another PMSPA account and links exist. */
export function saveConnection(
  body: SavePmspaConnectionDto
): PmspaConnectionDto | PmspaAccountSwitchProblem {
  const password = body.password || connection?.password || "";
  const result = login(body.url, body.email, password);
  const previous = connection?.accountId ?? linkAccount();
  if (
    result.status === "connected" &&
    previous &&
    result.accountId !== previous
  ) {
    const count = remote.links.filter(
      (l) => l.pmspaUserId !== result.accountId
    ).length;
    if (count > 0 && !body.confirmAccountSwitch) {
      return {
        slug: "pmspa-account-switch",
        linkCount: count,
        accountEmail: ACCOUNTS.find((a) => a.id === result.accountId)!.email
      };
    }
    remote = {
      ...remote,
      links: remote.links.filter((l) => l.pmspaUserId === result.accountId)
    };
  }
  connection = {
    url: body.url,
    email: body.email,
    password,
    status: result.status,
    accountId:
      result.status === "connected"
        ? result.accountId
        : (connection?.accountId ?? null),
    lastCheckedAt: new Date().toISOString()
  };
  return connectionDto();
}

/** The account the kept links were made with, while disconnected (OQ-162). */
const linkAccount = () => remote.links[0]?.pmspaUserId ?? null;

export function testConnection(): PmspaConnectionDto | null {
  if (!connection) return null;
  const result = login(connection.url, connection.email, connection.password);
  connection = {
    ...connection,
    status: result.status,
    accountId:
      result.status === "connected" ? result.accountId : connection.accountId,
    lastCheckedAt: new Date().toISOString()
  };
  return connectionDto();
}

/** API-INT-004: credentials and token go, the links stay (FR-INT-005). */
export function disconnect() {
  connection = null;
}

/** The prototype shell's switch: simulates what PMSPA would answer on the next check. */
export function forceStatus(status: PmspaConnectionStatus) {
  if (status === "not-configured") return disconnect();
  connection = {
    ...(connection ?? {
      url: "https://pmspa.example.com",
      email: ACCOUNTS[0].email,
      password: "secret",
      accountId: A
    }),
    status,
    lastCheckedAt: new Date().toISOString()
  };
}

export const isConnected = () => connection?.status === "connected";

// ---------- cold start (OQ-165) ----------

/** PMSPA runs on an Azure F1 plan: after idling, its first answer takes long. Set from the prototype banner. */
/** The prototype shell's switch: the next import, sync or push commit answers 409 `pmspa-sync-running` (OQ-199). */
let syncRunningOnce = false;
export const runOtherSync = () => {
  syncRunningOnce = true;
};
export function takeSyncRunning(): boolean {
  const was = syncRunningOnce;
  syncRunningOnce = false;
  return was;
}

let asleep = false;
export const COLD_START_MS = 9000;
export const sleepPmspa = () => {
  asleep = true;
};
/** The extra wait of the next call that reaches PMSPA; it wakes PMSPA up. */
export function wakeDelay(): number {
  if (!asleep) return 0;
  asleep = false;
  return COLD_START_MS;
}

// ---------- rate limit (FR-INT-014) ----------

/**
 * PMSPA allows 100 requests per 15-minute window per client IP and reports the count in `X-RateLimit-*` headers on
 * every answer. The API keeps the last answer's numbers per host until the window resets (proposed). Seeded mid-window.
 */
const RATE_LIMIT = 100;
const WINDOW_MS = 15 * 60_000;
let quota: { used: number; resetAt: number; observedAt: number } | null = {
  used: 37,
  resetAt: Date.now() + 9 * 60_000,
  observedAt: Date.now() - 2 * 60_000
};

/** Null once the window has reset: PM4 hasn't called PMSPA since. */
function rateLimitDto(): PmspaRateLimitDto | null {
  if (!quota || Date.now() >= quota.resetAt) return null;
  return {
    limit: RATE_LIMIT,
    remaining: Math.max(0, RATE_LIMIT - quota.used),
    resetAt: new Date(quota.resetAt).toISOString(),
    observedAt: new Date(quota.observedAt).toISOString()
  };
}

/**
 * Spends `n` PMSPA requests (one PM4 call can make several: list pages, one read per day). Returns 0, or the
 * seconds until the window resets when PMSPA would answer 429.
 */
export function spendRequests(n: number): number {
  const now = Date.now();
  if (!quota || now >= quota.resetAt)
    quota = { used: 0, resetAt: now + WINDOW_MS, observedAt: now };
  quota.observedAt = now;
  if (quota.used >= RATE_LIMIT)
    return Math.max(1, Math.ceil((quota.resetAt - now) / 1000));
  quota.used = Math.min(RATE_LIMIT, quota.used + n);
  return 0;
}

/** The prototype shell's switch: `used` requests in a window that resets in `resetInMinutes`, or null for a reset window. */
export function forceRateLimit(used: number | null, resetInMinutes = 6) {
  const now = Date.now();
  quota =
    used === null
      ? null
      : { used, resetAt: now + resetInMinutes * 60_000, observedAt: now };
}

// ---------- links (FR-INT-010) ----------

/** Links in use: a connection is saved and it's the account they were made with. */
const active = () =>
  connection && connection.accountId
    ? remote.links.filter((l) => l.pmspaUserId === connection!.accountId)
    : [];

export function activeLinks(type: PmspaLinkType) {
  return active()
    .filter((l) => l.type === type)
    .map((l) => ({
      pm4Id: l.pm4Id,
      origin: l.origin,
      syncedAt: l.syncedAt,
      pmspaCreatedAt: createdAtOf(l.pmspaId)
    }));
}

const byPm4 = (type: PmspaLinkType, id: string) =>
  active().find((l) => l.type === type && l.pm4Id === id);
const byPmspa = (type: PmspaLinkType, id: string) =>
  active().find((l) => l.type === type && l.pmspaId === id);

/** API-INT-014: one link with its PMSPA counterpart, read live (OQ-164). */
export function linkDetail(
  type: PmspaLinkType,
  pm4Id: string
): PmspaLinkDetailDto | null {
  const l = byPm4(type, pm4Id);
  if (!l) return null;
  let pmspa: PmspaLinkDetailDto["pmspa"] = null;
  if (type === "time-log") {
    const e = remote.events.find((x) => x.logs.some((y) => y.id === l.pmspaId));
    const log = e?.logs.find((y) => y.id === l.pmspaId);
    if (e && log) pmspa = { type, title: log.title, eventTitle: e.title };
  } else if (type === "project") {
    const r = remote.projects.find((x) => x.id === l.pmspaId);
    if (r) pmspa = { type, title: r.title, lead: r.pl, done: r.done };
  } else {
    const r = remote.tasks.find((x) => x.id === l.pmspaId);
    if (r)
      pmspa = {
        type,
        title: r.title,
        projectTitle:
          remote.projects.find((x) => x.id === r.projectId)?.title ?? "",
        column: r.column
      };
  }
  return { origin: l.origin, syncedAt: l.syncedAt, pmspa };
}

export function unlink(type: PmspaLinkType, pm4Id: string): boolean {
  const before = remote.links.length;
  remote = {
    ...remote,
    links: remote.links.filter((l) => !(l.type === type && l.pm4Id === pm4Id))
  };
  return remote.links.length < before;
}

/** A PM4 edit of a linked record (design principle 7). */
export function touched(type: PmspaLinkType, pm4Id: string) {
  remote = {
    ...remote,
    links: remote.links.map((l) =>
      l.type === type && l.pm4Id === pm4Id ? { ...l, pm4Changed: true } : l
    )
  };
}

/** A PM4 delete drops the link; the PMSPA record stays (design principle 8). */
export function deleted(type: PmspaLinkType, pm4Ids: string[]) {
  remote = {
    ...remote,
    links: remote.links.filter(
      (l) => !(l.type === type && pm4Ids.includes(l.pm4Id))
    )
  };
}

/** `origin` applies to a new pairing; re-syncing an existing link keeps the origin it was made with. */
function setLink(
  type: PmspaLinkType,
  pm4Id: string,
  pmspaId: string,
  now: string,
  origin: PmspaLinkOrigin
) {
  const same = remote.links.find(
    (l) => l.type === type && l.pm4Id === pm4Id && l.pmspaId === pmspaId
  );
  const rest = remote.links.filter(
    (l) => !(l.type === type && (l.pm4Id === pm4Id || l.pmspaId === pmspaId))
  );
  remote = {
    ...remote,
    links: [
      ...rest,
      {
        type,
        pm4Id,
        pmspaId,
        pmspaUserId: connection!.accountId!,
        origin: same?.origin ?? origin,
        syncedAt: now,
        pm4Changed: false,
        pmspaChanged: false
      }
    ]
  };
}

// ---------- browse (API-INT-005…007) ----------

const mine = () =>
  remote.projects.filter((p) => p.userId === connection?.accountId);

function recordLink(
  type: "project" | "task",
  pmspaId: string
): PmspaRecordLinkDto | null {
  const l = byPmspa(type, pmspaId);
  if (!l) return null;
  const s = getMockState();
  const pm4 =
    type === "project"
      ? s.projects.find((p) => p.id === l.pm4Id)
      : s.tasks.find((t) => t.id === l.pm4Id);
  return pm4
    ? {
        pm4Id: pm4.id,
        pm4Title: pm4.title,
        origin: l.origin,
        syncedAt: l.syncedAt
      }
    : null;
}

export function listProjects(): PmspaProjectDto[] {
  return mine().map((p) => ({
    id: p.id,
    title: p.title,
    done: p.done,
    taskCount: remote.tasks.filter((t) => t.projectId === p.id).length,
    link: recordLink("project", p.id)
  }));
}

const taskDto = (t: (typeof remote.tasks)[number]): PmspaTaskDto => ({
  id: t.id,
  projectId: t.projectId,
  title: t.title,
  column: t.column,
  link: recordLink("task", t.id)
});

/** OQ-201 (1): PMSPA's `tasks?project=` is owner-scoped, so another account's project has no tasks. */
export function listTasks(projectId: string): PmspaTaskDto[] {
  if (!mine().some((p) => p.id === projectId)) return [];
  return remote.tasks.filter((t) => t.projectId === projectId).map(taskDto);
}

/** Proposed API-INT-017: every task of the account's projects (OQ-201 (3)). */
export function listAllTasks(): PmspaTaskDto[] {
  const projects = new Set(mine().map((p) => p.id));
  return remote.tasks.filter((t) => projects.has(t.projectId)).map(taskDto);
}

/** Where an event sits in PMSPA, shown on its preview row with the project and task icons. */
const taskPath = (t: { title: string; projectId: string }) => ({
  projectTitle: remote.projects.find((p) => p.id === t.projectId)?.title ?? "?",
  taskTitle: t.title
});
const taskOf = (id: string | null) =>
  remote.tasks.find((t) => t.id === id) ?? null;
const hoursToMinutes = (h: number) => Math.round(h * 60);

/** Proposed API-INT-007: the range lookup's answer, newest first (one PMSPA call). */
export function listDays(from: string, to: string): PmspaDaySummaryDto[] {
  if (!connection?.accountId) return [];
  return [...new Set(remote.events.map((e) => e.date))]
    .filter((d) => d >= from && d <= to)
    .sort()
    .reverse()
    .map((date) => ({
      date,
      startMinute: remote.starts[date] ?? null,
      eventCount: remote.events.filter((e) => e.date === date).length
    }));
}

/** PMSPA calls API-INT-018 makes: one per day, then one per distinct task and per distinct project. */
export function dayDetailsCost(dates: string[]): number {
  const events = remote.events.filter((e) => dates.includes(e.date));
  const tasks = new Set(events.flatMap((e) => (e.taskId ? [e.taskId] : [])));
  const projects = new Set(
    [...tasks].flatMap((id) => {
      const t = taskOf(id);
      return t ? [t.projectId] : [];
    })
  );
  return Math.max(1, dates.length + tasks.size + projects.size);
}

/**
 * Proposed API-INT-019 (OQ-204): the PMSPA records each PM4 record of `for` can link to: the account's projects,
 * or one PMSPA project's tasks. A PM4 id that isn't the user's is left out.
 */
export function listCandidates(
  input: PmspaCandidatesInputDto
): { pm4Id: string; candidates: SyncCandidateDto[] }[] {
  const s = getMockState();
  if (input.type === "project")
    return input.for.flatMap((id) => {
      const p = s.projects.find((x) => x.id === id);
      return p ? [{ pm4Id: id, candidates: pmspaProjectCandidates(p) }] : [];
    });
  return input.for.flatMap((id) => {
    const t = s.tasks.find((x) => x.id === id);
    return t
      ? [
          {
            pm4Id: id,
            candidates: pmspaTaskCandidates(t).filter(
              (c) => c.groupId === input.projectId
            )
          }
        ]
      : [];
  });
}

/** PMSPA calls API-INT-019 makes: a projects list or one project's tasks, 50 per page. */
export function candidatesCost(input: PmspaCandidatesInputDto): number {
  const n =
    input.type === "project"
      ? mine().length
      : remote.tasks.filter((t) => t.projectId === input.projectId).length;
  return Math.max(1, Math.ceil(n / 50));
}

/**
 * PMSPA calls a sync or push preview makes (OQ-204): a linked project and its task list, a linked task and its
 * project, or a day's PMSPA events plus its linked tasks and their projects. Nothing for unlinked records.
 */
export function previewCost(
  target: PmspaSyncTargetDto | PmspaPushTargetDto
): number {
  const s = getMockState();
  if (target.type === "project") {
    const l = byPm4("project", target.id);
    if (!l) return 0;
    const tasks = remote.tasks.filter((t) => t.projectId === l.pmspaId).length;
    return 1 + Math.max(1, Math.ceil(tasks / 50));
  }
  if (target.type === "task") {
    const t = s.tasks.find((x) => x.id === target.id);
    if (!t) return 0;
    return (
      Number(Boolean(byPm4("task", t.id))) +
      Number(Boolean(t.project.id && byPm4("project", t.project.id)))
    );
  }
  const groups = groupDay(target.id);
  const tasks = new Set(
    groups.flatMap((g) =>
      g.task && byPm4("task", g.task.id) ? [g.task.id] : []
    )
  );
  const projects = new Set(
    groups.flatMap((g) =>
      g.task && tasks.has(g.task.id) && g.project ? [g.project.id] : []
    )
  );
  return 2 + tasks.size + projects.size;
}

/** Proposed API-INT-018: the given days with their events, newest first; a date without events is left out. */
export function listDayDetails(dates: string[]): PmspaDayDto[] {
  if (!connection?.accountId) return [];
  const found = new Set(remote.events.map((e) => e.date));
  return [...new Set(dates)]
    .filter((d) => found.has(d))
    .sort()
    .reverse()
    .map((date) => {
      const events = remote.events.filter((e) => e.date === date);
      const logs = events.flatMap((e) => e.logs);
      const linked = logs.filter((l) => byPmspa("time-log", l.id)).length;
      return {
        date,
        startMinute: remote.starts[date] ?? null,
        totalMinutes: logs.reduce((t, l) => t + hoursToMinutes(l.duration), 0),
        linkState:
          linked === 0
            ? "not-linked"
            : linked === logs.length
              ? "linked"
              : "partly-linked",
        events: events.map((e) => {
          const task = taskOf(e.taskId);
          return {
            id: e.id,
            title: e.title,
            task: task
              ? {
                  id: task.id,
                  title: task.title,
                  projectTitle:
                    remote.projects.find((p) => p.id === task.projectId)
                      ?.title ?? ""
                }
              : null,
            logs: e.logs.map((l) => ({
              id: l.id,
              title: l.title,
              durationMinutes: hoursToMinutes(l.duration),
              linked: Boolean(byPmspa("time-log", l.id))
            }))
          };
        })
      };
    });
}

// ---------- shared preview helpers ----------

/** "a", "a and b", "a, b and c". */
const listJoin = (parts: string[]) =>
  parts.length < 2
    ? (parts[0] ?? "")
    : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;

type Item = SyncPreviewItemDto;

const cut = (s: string, max: number) =>
  s.length > max ? s.slice(0, max - 1) + "…" : s;

function row(
  partial: Partial<Item> & Pick<Item, "key" | "type" | "title" | "action">
): Item {
  return {
    parentKey: null,
    linkedId: null,
    detail: null,
    direction: null,
    reason: null,
    parent: false,
    optional: false,
    candidates: [],
    differences: [],
    warnings: [],
    ...partial
  };
}

/** Not linked: create on the other side (an import in PM4, a sync or push in PMSPA). */
const createAction = (
  mode: "import" | "push" | "sync"
): Pick<Item, "action" | "direction" | "reason"> => ({
  action: "create",
  direction: mode === "import" ? "to-pm4" : "to-pmspa",
  reason: null
});

/**
 * OQ-173: a linked project or task, on an import, a sync or a push alike. Its shared fields match → up to date;
 * they differ → `differs`, with the side that changed since the last sync as the suggestion (Link only when
 * both or neither did).
 */
function pairAction(
  l: Link,
  differences: SyncFieldDiffDto[]
): Pick<Item, "action" | "direction" | "reason" | "differences"> {
  if (differences.length === 0)
    return {
      action: "skip",
      direction: null,
      reason: "Same in PM4 and PMSPA",
      differences
    };
  const [direction, reason]: [SyncDirection | null, string] =
    l.pm4Changed && l.pmspaChanged
      ? [null, "Changed on both sides since the last sync"]
      : l.pm4Changed
        ? ["to-pmspa", "Changed in PM4 since the last sync"]
        : l.pmspaChanged
          ? ["to-pm4", "Changed in PMSPA since the last sync"]
          : [null, "Different since they were linked"];
  return { action: "differs", direction, reason, differences };
}

/** A project's lead, to tell two projects apart in the preview (OQ-172). */
const leadDetail = (name: string | null | undefined) =>
  name ? `Lead ${name}` : null;

const sortByMatch = (items: SyncCandidateDto[], title: string) =>
  [...items].sort(
    (a, b) =>
      Number(b.title.toLowerCase() === title.toLowerCase()) -
        Number(a.title.toLowerCase() === title.toLowerCase()) ||
      a.title.localeCompare(b.title)
  );

const pm4ProjectCandidates = (r: RemoteProject) =>
  sortByMatch(
    getMockState()
      .projects.filter((p) => !byPm4("project", p.id))
      .map((p) => ({
        id: p.id,
        title: p.title,
        groupId: null,
        detail: leadDetail(p.projectLead?.name),
        differences: projectDiff(p, r)
      })),
    r.title
  );
const pm4TaskCandidates = (r: RemoteTask) =>
  sortByMatch(
    getMockState()
      .tasks.filter((t) => !byPm4("task", t.id))
      .map((t) => ({
        id: t.id,
        title: t.title,
        groupId: t.project.id,
        detail: COLUMN[t.status],
        differences: taskDiff(t, r)
      })),
    r.title
  );
const pmspaProjectCandidates = (p: Project) =>
  sortByMatch(
    mine()
      .filter((r) => !byPmspa("project", r.id))
      .map((r) => ({
        id: r.id,
        title: r.title,
        groupId: null,
        detail: leadDetail(r.pl),
        differences: projectDiff(p, r)
      })),
    p.title
  );
const pmspaTaskCandidates = (t: Task) =>
  sortByMatch(
    remote.tasks
      .filter(
        (r) =>
          !byPmspa("task", r.id) && mine().some((p) => p.id === r.projectId)
      )
      .map((r) => ({
        id: r.id,
        title: r.title,
        groupId: r.projectId,
        detail: r.column,
        differences: taskDiff(t, r)
      })),
    t.title
  );

/** Empty text is no value. */
const val = (v: string | null | undefined) => (v && v.trim() ? v : null);

function diff(
  fields: [string, string | null, string | null][]
): SyncFieldDiffDto[] {
  return fields
    .filter(([, pm4, pmspa]) => pm4 !== pmspa)
    .map(([field, pm4, pmspa]) => ({ field, pm4, pmspa }));
}

/**
 * OQ-173: every field the two sides share (*Entity mapping*), PM4's text cut as PMSPA would store it. A task's
 * due date counts only when the PM4 task has one (PMSPA always does).
 */
function projectDiff(p: Project, r: RemoteProject) {
  return diff([
    ["Title", cut(p.title, 150), r.title],
    [
      "Description",
      val(p.description) && cut(p.description!, 350),
      val(r.description)
    ],
    ["Lead", val(p.projectLead?.name), val(r.pl)],
    ["External link", val(p.externalLink), val(r.kanboard)]
  ]);
}

function taskDiff(t: Task, r: RemoteTask) {
  return diff([
    ["Title", cut(t.title, 150), r.title],
    [
      "Description",
      val(t.description) && cut(t.description!, 350),
      val(r.description)
    ],
    ["Status", COLUMN[t.status], r.column],
    ["Lead", val(t.projectLead?.name), val(r.pl)],
    ["External link", val(t.externalLink), val(r.kanboard)],
    ...(t.dueDate
      ? [
          [
            "Due date",
            formatWorkDate(t.dueDate),
            formatWorkDate(r.dueDate)
          ] as [string, string, string]
        ]
      : [])
  ]);
}

/** The API's OQ-194 checks, in its order: why a PMSPA log can't be imported, or null. */
function logFailure(log: { duration: number; title: string }): string | null {
  if (!Number.isInteger(log.duration * 4))
    return `A log of ${log.duration} h isn't in 0.25 h steps`;
  if (log.duration < 0.25 || log.duration > 24)
    return `A log of ${log.duration} h isn't between 0.25 h and 24 h`;
  if (log.title.trim().length > 1000)
    return "A log's text is over 1000 characters";
  return null;
}

const plural = (n: number, one: string, many = one + "s") =>
  `${n} ${n === 1 ? one : many}`;

/** Minutes booked on a PM4 log, as client.ts `bookedOf` (0 while the log isn't bookable). */
const bookedOf = (l: TimeLog): number =>
  l.excludeFromStats || l.project === null
    ? 0
    : (getMockState().bookings[l.id] ?? []).reduce((t, b) => t + b.minutes, 0);

/** The booked-time failure of a linked log the import would update, or null (OQ-220). */
function overBooked(e: RemoteEvent, log: RemoteLog): string | null {
  if (!taskOf(e.taskId) || e.title.trim().toLowerCase() === NONPROD)
    return null;
  const link = byPmspa("time-log", log.id);
  const l = link && getMockState().logs.find((x) => x.id === link.pm4Id);
  if (!l) return null;
  const b = bookedOf(l);
  return hoursToMinutes(log.duration) < b
    ? `${formatDuration(b)} of a log is booked in PM4: remove bookings first, or keep at least ${formatDuration(b)}`
    : null;
}
// OQ-196: the logs an event with a failed log still imported.
const otherLogsImported = (n: number) =>
  n === 0
    ? "no other logs were imported"
    : n === 1
      ? "1 other log was imported"
      : `${n} other logs were imported`;
const eventDetail = (n: number, minutes: number) =>
  `${plural(n, "log")} · ${formatDuration(minutes)}`;

// ---------- import (API-INT-008, API-INT-009) ----------

export function importPreview(sel: PmspaImportSelectionDto): Item[] {
  const items: Item[] = [];
  const projectKeys = new Set<string>();
  const taskKeys = new Set<string>();

  const addProject = (p: RemoteProject, parentOf?: string) => {
    const key = `project:${p.id}`;
    if (projectKeys.has(key)) return key;
    projectKeys.add(key);
    const l = byPmspa("project", p.id);
    const pm4 = l
      ? getMockState().projects.find((x) => x.id === l.pm4Id)
      : undefined;
    const { reason, ...action } =
      l && pm4 ? pairAction(l, projectDiff(pm4, p)) : createAction("import");
    items.push(
      row({
        key,
        type: "project",
        title: p.title,
        detail: l
          ? `Linked to ${recordLink("project", p.id)?.pm4Title}`
          : leadDetail(p.pl),
        ...action,
        reason: parentOf ?? reason,
        parent: Boolean(parentOf),
        linkedId: l?.pm4Id ?? null,
        candidates: l ? [] : pm4ProjectCandidates(p),
        warnings: p.done
          ? [
              "Done in PMSPA: PM4 projects have no status, so this isn't imported."
            ]
          : []
      })
    );
    return key;
  };
  const addTask = (t: RemoteTask, parentOf?: string) => {
    const key = `task:${t.id}`;
    if (taskKeys.has(key)) return key;
    const project = remote.projects.find((p) => p.id === t.projectId)!;
    const parentKey = addProject(
      project,
      byPmspa("project", project.id)
        ? undefined
        : "Parent of the selected tasks"
    );
    taskKeys.add(key);
    const l = byPmspa("task", t.id);
    const pm4 = l
      ? getMockState().tasks.find((x) => x.id === l.pm4Id)
      : undefined;
    items.push(
      row({
        key,
        parentKey,
        type: "task",
        title: t.title,
        detail: t.column,
        ...(l && pm4
          ? pairAction(l, taskDiff(pm4, t))
          : createAction("import")),
        ...(parentOf ? { reason: parentOf, parent: true } : {}),
        linkedId: l?.pm4Id ?? null,
        candidates: l ? [] : pm4TaskCandidates(t)
      })
    );
    return key;
  };

  for (const sp of sel.projects) {
    const p = mine().find((x) => x.id === sp.id);
    if (!p) continue;
    addProject(p);
    const ids =
      sp.taskIds ??
      remote.tasks.filter((t) => t.projectId === p.id).map((t) => t.id);
    for (const id of ids) {
      const t = taskOf(id);
      if (t) addTask(t);
    }
  }

  const dates = [...(sel.dates ?? [])].sort();
  // Parents first (design principle 5): every project and task above every day, each unlinked event task
  // saying which days it comes from.
  const parentTasks = new Map<
    string,
    { task: RemoteTask; events: number; dates: string[] }
  >();
  for (const date of dates)
    for (const e of remote.events.filter((x) => x.date === date)) {
      const t = taskOf(e.taskId);
      if (!t || byPmspa("task", t.id)) continue;
      const entry = parentTasks.get(t.id) ?? { task: t, events: 0, dates: [] };
      entry.events++;
      if (!entry.dates.includes(date)) entry.dates.push(date);
      parentTasks.set(t.id, entry);
    }
  for (const { task, events, dates: on } of parentTasks.values())
    addTask(
      task,
      `Parent of ${events === 1 ? "an imported event" : "imported events"} from ${listJoin(on.map(formatWorkDate))}`
    );

  for (const date of dates) {
    const events = remote.events.filter((e) => e.date === date);
    const dayKey = `day:${date}`;
    const logs = events.flatMap((e) => e.logs);
    const linked = logs
      .map((l) => byPmspa("time-log", l.id))
      .filter((l): l is Link => Boolean(l));
    items.push(
      row({
        key: dayKey,
        type: "day",
        title: formatWorkDate(date),
        detail: eventDetail(
          logs.length,
          logs.reduce((s, l) => s + hoursToMinutes(l.duration), 0)
        ),
        action:
          logs.length === 0
            ? "skip"
            : linked.length === 0
              ? "create"
              : linked.some((l) => l.pmspaChanged)
                ? "update"
                : "skip",
        reason:
          logs.length === 0
            ? "No logs"
            : linked.length === logs.length &&
                !linked.some((l) => l.pmspaChanged)
              ? "Already imported"
              : null
      })
    );
    for (const e of events) {
      const t = taskOf(e.taskId);
      const eLinks = e.logs.map((l) => byPmspa("time-log", l.id));
      const warnings: string[] = [];
      const offStep = e.logs.filter((l) => !Number.isInteger(l.duration * 4));
      if (offStep.length)
        warnings.push(
          `${plural(offStep.length, "log")} of ${offStep.map((l) => `${l.duration} h`).join(", ")} isn't in 0.25 h steps and will fail.`
        );
      // OQ-197: the commit's other checks (logFailure's order), each log warned about once.
      const outOfRange = e.logs.filter(
        (l) => !offStep.includes(l) && (l.duration < 0.25 || l.duration > 24)
      );
      if (outOfRange.length)
        warnings.push(
          `${plural(outOfRange.length, "log")} of ${outOfRange.map((l) => `${l.duration} h`).join(", ")} isn't between 0.25 h and 24 h and will fail.`
        );
      const tooLong = e.logs.filter(
        (l) =>
          !offStep.includes(l) &&
          !outOfRange.includes(l) &&
          l.title.trim().length > 1000
      );
      if (tooLong.length)
        warnings.push(
          `${plural(tooLong.length, "log")} with a text over 1000 characters will fail.`
        );
      const pm4Logs = eLinks
        .filter(Boolean)
        .map((l) => getMockState().logs.find((x) => x.id === l!.pm4Id));
      const moved =
        t &&
        pm4Logs.filter(
          (x) =>
            x &&
            x.task?.id !== byPmspa("task", t.id)?.pm4Id &&
            byPmspa("task", t.id)
        );
      if (moved && moved.length)
        warnings.push(
          `${plural(moved.length, "PM4 log")} moves to “${t!.title}” (its task changed in PMSPA).`
        );
      const action: SyncPreviewItemDto["action"] =
        eLinks.length === 0
          ? "skip"
          : eLinks.every(Boolean)
            ? eLinks.some((l) => l!.pmspaChanged)
              ? "update"
              : "skip"
            : eLinks.some(Boolean)
              ? "update"
              : "create";
      // The booked-time failure: each log the import would update and can't take (OQ-220).
      const booked = e.logs.filter(
        (l) =>
          !offStep.includes(l) &&
          !outOfRange.includes(l) &&
          !tooLong.includes(l) &&
          overBooked(e, l) !== null
      );
      if (action !== "skip" && booked.length) {
        const amounts = booked.map((l) => {
          const link = byPmspa("time-log", l.id);
          const pm4 = getMockState().logs.find((x) => x.id === link?.pm4Id);
          return formatDuration(pm4 ? bookedOf(pm4) : 0);
        });
        warnings.push(
          `${plural(booked.length, "log")} of ${booked.map((l) => `${l.duration} h`).join(", ")} is shorter than the time booked in PM4 (${amounts.join(", ")}) and will fail.`
        );
      }
      items.push(
        row({
          key: `event:${e.id}`,
          parentKey: dayKey,
          type: "event",
          title: e.title,
          ...(t ? { taskPath: taskPath(t) } : {}),
          detail: `${t ? "" : `${e.title.trim().toLowerCase() === NONPROD ? "No task → Unsorted, excluded from statistics" : "No task → Unsorted"} · `}${eventDetail(
            e.logs.length,
            e.logs.reduce((s, l) => s + hoursToMinutes(l.duration), 0)
          )}`,
          action,
          reason:
            eLinks.length === 0
              ? "No logs"
              : eLinks.every(Boolean) && !eLinks.some((l) => l!.pmspaChanged)
                ? "Already imported"
                : null,
          warnings
        })
      );
    }
  }
  return items;
}

const choiceFor = (choices: SyncChoiceDto[], item: Item): SyncChoiceDto =>
  choices.find((c) => c.key === item.key) ??
  (item.action === "differs" && item.linkedId
    ? {
        key: item.key,
        kind: "link",
        id: item.linkedId,
        overwrite: item.direction
      }
    : { key: item.key, kind: "create" });

function result(
  item: Item,
  outcome: SyncResultItemDto["outcome"],
  reason: string | null = null
): SyncResultItemDto {
  return {
    key: item.key,
    parentKey: item.parentKey,
    type: item.type,
    title: item.title,
    newTitle: null,
    outcome,
    reason
  };
}

/** OQ-174: the title of the row's record (the side its key names) after the write. */
function titleNow(type: PairType, id: string, from: "pm4" | "pmspa") {
  if (from === "pmspa")
    return type === "project"
      ? remote.projects.find((x) => x.id === id)?.title
      : taskOf(id)?.title;
  const s = getMockState();
  return type === "project"
    ? s.projects.find((x) => x.id === id)?.title
    : s.tasks.find((x) => x.id === id)?.title;
}

const STATUS: Record<PmspaColumn, Status> = {
  Upcoming: "upcoming",
  "In Progress": "in-progress",
  Completed: "completed"
};
const COLUMN: Record<Status, PmspaColumn> = {
  upcoming: "Upcoming",
  "in-progress": "In Progress",
  completed: "Completed"
};
const textLead = (name: string) => ({
  kind: "text" as const,
  user: null,
  name: cut(name, 100)
});

// ---------- projects and tasks, both ways (OQ-172) ----------

type PairType = "project" | "task";

const OVERWRITTEN: Record<SyncDirection, string> = {
  "to-pmspa": "PMSPA overwritten with PM4's version",
  "to-pm4": "PM4 overwritten with PMSPA's version"
};
const NO_PMSPA_PROJECT = "Its project isn't in PMSPA (it was left out).";
const NO_PM4_PROJECT = "Its project wasn't imported.";

const pmspaProjectFields = (p: Project) => ({
  title: cut(p.title, 150),
  description: cut(p.description ?? "", 350),
  pl: p.projectLead?.name ?? "",
  kanboard: p.externalLink ?? ""
});

const pm4Lead = (pl: string) => (val(pl) ? textLead(pl) : null);

const pm4ProjectFields = (r: RemoteProject, now: string) => ({
  title: r.title,
  description: r.description || null,
  externalLink: r.kanboard || null,
  projectLead: pm4Lead(r.pl),
  updatedAt: now
});

/** Null while the task's project has no PMSPA counterpart. */
function pmspaTaskFields(t: Task) {
  const projectLink = byPm4("project", t.project.id ?? "");
  return projectLink
    ? {
        projectId: projectLink.pmspaId,
        title: cut(t.title, 150),
        description: cut(t.description ?? "", 350),
        column: COLUMN[t.status],
        pl: t.projectLead?.name ?? "",
        kanboard: t.externalLink ?? "",
        // Without a due date PMSPA stores the creation time (OQ-159).
        dueDate: t.dueDate ?? todayStr
      }
    : null;
}

/** Null while the task's PMSPA project has no PM4 counterpart. */
function pm4TaskFields(r: RemoteTask, now: string) {
  const projectLink = byPmspa("project", r.projectId);
  const project =
    projectLink &&
    getMockState().projects.find((p) => p.id === projectLink.pm4Id);
  return project
    ? {
        title: r.title,
        description: r.description || null,
        status: STATUS[r.column],
        projectLead: pm4Lead(r.pl),
        externalLink: r.kanboard || null,
        // Import keeps PMSPA's due date (OQ-159).
        dueDate: r.dueDate,
        project: { id: project.id, title: project.title, deleted: false },
        updatedAt: now
      }
    : null;
}

/** Writes one record of a pair over the other. Returns why it failed, or null. */
function overwrite(
  type: PairType,
  pm4Id: string,
  pmspaId: string,
  direction: SyncDirection,
  now: string
): string | null {
  const s = getMockState();
  if (type === "project") {
    if (direction === "to-pmspa") {
      const fields = pmspaProjectFields(
        s.projects.find((x) => x.id === pm4Id)!
      );
      remote = {
        ...remote,
        projects: remote.projects.map((x) =>
          x.id === pmspaId ? { ...x, ...fields } : x
        )
      };
    } else {
      const fields = pm4ProjectFields(
        remote.projects.find((x) => x.id === pmspaId)!,
        now
      );
      mock.setProjects(
        s.projects.map((x) => (x.id === pm4Id ? { ...x, ...fields } : x))
      );
    }
    return null;
  }
  if (direction === "to-pmspa") {
    const fields = pmspaTaskFields(s.tasks.find((x) => x.id === pm4Id)!);
    if (!fields) return NO_PMSPA_PROJECT;
    remote = {
      ...remote,
      tasks: remote.tasks.map((x) =>
        x.id === pmspaId ? { ...x, ...fields } : x
      )
    };
  } else {
    const fields = pm4TaskFields(taskOf(pmspaId)!, now);
    if (!fields) return NO_PM4_PROJECT;
    mock.setTasks(
      s.tasks.map((x) => (x.id === pm4Id ? { ...x, ...fields } : x))
    );
  }
  return null;
}

/** Creates the record's counterpart on the other side, and the link. */
function createPair(
  item: Item,
  type: PairType,
  id: string,
  from: "pm4" | "pmspa",
  now: string
): SyncResultItemDto {
  const s = getMockState();
  if (from === "pm4" && type === "project") {
    const created = {
      id: oid(),
      userId: connection!.accountId!,
      done: false,
      ...pmspaProjectFields(s.projects.find((x) => x.id === id)!)
    };
    remote = { ...remote, projects: [...remote.projects, created] };
    setLink("project", id, created.id, now, "pushed");
  } else if (from === "pm4") {
    const fields = pmspaTaskFields(s.tasks.find((x) => x.id === id)!);
    if (!fields) return result(item, "failed", NO_PMSPA_PROJECT);
    const created = { id: oid(), ...fields };
    remote = { ...remote, tasks: [...remote.tasks, created] };
    setLink("task", id, created.id, now, "pushed");
  } else if (type === "project") {
    const created: Project = {
      ...s.projects[0],
      ...pm4ProjectFields(
        remote.projects.find((x) => x.id === id)!,
        now
      ),
      id: nextId("p-new"),
      services: [],
      createdAt: now
    };
    mock.setProjects([...s.projects, created]);
    setLink("project", created.id, id, now, "imported");
  } else {
    const fields = pm4TaskFields(taskOf(id)!, now);
    if (!fields) return result(item, "failed", NO_PM4_PROJECT);
    const created: Task = {
      ...s.tasks[0],
      ...fields,
      id: nextId("t-new"),
      service: null,
      createdAt: now
    };
    mock.setTasks([...s.tasks, created]);
    setLink("task", created.id, id, now, "imported");
  }
  return result(item, "created");
}

/**
 * OQ-172, OQ-173: one project or task row of an import, a sync or a push; `from` is the side its key names. Not
 * linked: its counterpart is created, or the picked record is linked. A link (new, or one that differs) writes
 * nothing unless the choice names a side to overwrite (Link only), and marks the pair synced.
 */
function syncPair(
  item: Item,
  choice: SyncChoiceDto,
  from: "pm4" | "pmspa",
  now: string
): SyncResultItemDto {
  const type = item.type as PairType;
  const [, id] = item.key.split(/:(.*)/);
  const l = from === "pm4" ? byPm4(type, id) : byPmspa(type, id);
  const other = l
    ? from === "pm4"
      ? l.pmspaId
      : l.pm4Id
    : choice.kind === "link"
      ? choice.id
      : null;
  if (!other) return createPair(item, type, id, from, now);
  const [pm4Id, pmspaId] = from === "pm4" ? [id, other] : [other, id];
  const direction = choice.kind === "link" ? choice.overwrite : null;
  const failure = direction && overwrite(type, pm4Id, pmspaId, direction, now);
  if (failure) return result(item, "failed", failure);
  setLink(type, pm4Id, pmspaId, now, "linked");
  const out = !l
    ? result(item, "linked", direction && OVERWRITTEN[direction])
    : direction
      ? result(item, "updated", OVERWRITTEN[direction])
      : result(item, "skipped", "Link only: both kept as they are");
  const title = titleNow(type, id, from);
  return title && title !== item.title ? { ...out, newTitle: title } : out;
}

export function runImport(
  sel: PmspaImportSelectionDto,
  choices: SyncChoiceDto[]
): SyncResultDto {
  const now = new Date().toISOString();
  const out: SyncResultItemDto[] = [];
  for (const item of importPreview(sel)) {
    const choice = choiceFor(choices, item);
    const id = item.key.split(":")[1];
    if (choice.kind === "skip" || item.action === "skip") {
      out.push(result(item, "skipped", item.reason ?? "Left out"));
      continue;
    }
    if (item.type === "project" || item.type === "task") {
      out.push(syncPair(item, choice, "pmspa", now));
      continue;
    }
    const s = getMockState();
    if (item.type === "day") {
      const date = id;
      if (remote.starts[date] !== undefined && s.starts[date] === undefined)
        mock.setStart(date, remote.starts[date]);
      out.push(result(item, item.action === "create" ? "created" : "updated"));
    } else {
      const e = remote.events.find((x) => x.id === id)!;
      const reasons = e.logs.map((l) => logFailure(l) ?? overBooked(e, l));
      const firstReason = reasons.find((r) => r !== null);
      const t = taskOf(e.taskId);
      const taskLink = t ? byPmspa("task", t.id) : undefined;
      const task = taskLink
        ? getMockState().tasks.find((x) => x.id === taskLink.pm4Id)
        : undefined;
      let failed = 0;
      for (const [i, l] of e.logs.entries()) {
        if (reasons[i] !== null) {
          failed++;
          continue;
        }
        // OQ-168: a "nonprod" event's logs are excluded from statistics.
        const nonprod = e.title.trim().toLowerCase() === NONPROD;
        const fields = {
          workDate: e.date,
          durationMinutes: hoursToMinutes(l.duration),
          text: l.title,
          title: cut(e.title, 100),
          excludeFromStats: nonprod,
          project: task ? task.project : null,
          task: task ? { id: task.id, title: task.title, deleted: false } : null
        };
        const existing = byPmspa("time-log", l.id);
        if (existing) {
          const old = getMockState().logs.find((x) => x.id === existing.pm4Id)!;
          // OQ-168: a linked log in "nonprod" keeps its PM4 task and project (PMSPA's event has none).
          // OQ-169: the event title only titles logs the import creates.
          const keep =
            nonprod && old.excludeFromStats
              ? { project: old.project, task: old.task, title: old.title }
              : { title: old.title };
          mock.updateLog(existing.pm4Id, { ...old, ...fields, ...keep });
          setLink("time-log", existing.pm4Id, l.id, now, "imported");
        } else {
          const created = mock.addLog(fields as Omit<TimeLog, "id">);
          setLink("time-log", created.id, l.id, now, "imported");
        }
      }
      out.push(
        failed
          ? result(
              item,
              "failed",
              `${firstReason} (${otherLogsImported(e.logs.length - failed)}).`
            )
          : result(item, item.action === "create" ? "created" : "updated")
      );
    }
  }
  lastSyncAt = now;
  return { items: out, syncedAt: now };
}

// ---------- push (API-INT-010, API-INT-011) ----------

interface Group {
  key: string;
  title: string;
  project: { id: string; title: string } | null;
  task: { id: string; title: string } | null;
  logs: TimeLog[];
  note: string | null;
}

/**
 * OQ-167: the project's title for a log with a task or a project; the log's own title for a log with
 * neither, else "Unsorted". Under PMSPA's 3-character minimum it gets " · Time".
 */
function eventTitle(
  project: { title: string } | null,
  logTitle: string | null
): string {
  const t = project?.title ?? (logTitle?.trim() || "Unsorted");
  return cut(t.length < 3 ? `${t} · Time` : t, 150);
}

/** OQ-168: the event a day's logs excluded from statistics go to. */
const NONPROD = "nonprod";

/** One PMSPA event per task and day, per project-only and day, and per log title and day for Unsorted (OQ-167), and "nonprod" for logs excluded from statistics (OQ-168). */
function groupDay(date: string): Group[] {
  const groups = new Map<string, Group>();
  for (const l of getMockState().logs.filter((x) => x.workDate === date)) {
    // OQ-168: logs excluded from statistics all go to the day's "nonprod" event, without a task.
    const nonprod = l.excludeFromStats;
    const task =
      !nonprod && l.task?.id ? { id: l.task.id, title: l.task.title } : null;
    const project =
      !nonprod && l.project?.id
        ? { id: l.project.id, title: l.project.title }
        : null;
    const title = nonprod ? NONPROD : eventTitle(project, l.title);
    const key = task
      ? `task:${task.id}`
      : project
        ? `project:${project.id}`
        : `unsorted:${title}`;
    const note =
      !nonprod && (l.project?.deleted || l.task?.deleted)
        ? `Deleted ${l.task?.deleted && project ? "task" : "project"} “${(l.task?.deleted ? l.task : l.project)!.title}”: pushed ${project ? `under ${project.title}` : "as Unsorted"}.`
        : null;
    const g = groups.get(key) ?? {
      key,
      title,
      project,
      task,
      logs: [],
      note: null
    };
    g.logs.push(l);
    g.note = g.note ?? note;
    groups.set(key, g);
  }
  return [...groups.values()];
}

/**
 * The PMSPA task a group's event goes under: the linked one's names, or the PM4 names it's created with. Null
 * without a task; the row's `detail` then says so (`pushedNoTask`).
 */
function pushedTaskPath(
  g: Group
): { projectTitle: string; taskTitle: string } | null {
  if (
    !g.task ||
    (g.title === NONPROD && g.logs.some((l) => l.excludeFromStats))
  )
    return null;
  const linked = taskOf(byPm4("task", g.task.id)?.pmspaId ?? null);
  return linked
    ? taskPath(linked)
    : { projectTitle: g.project?.title ?? "?", taskTitle: g.task.title };
}

/** A group's event without a PMSPA task. */
const pushedNoTask = (g: Group) =>
  g.title === NONPROD && g.logs.some((l) => l.excludeFromStats)
    ? "No task · Excluded from statistics"
    : "No task";

export function pushPreview(
  target: PmspaSyncTargetDto | PmspaPushTargetDto
): Item[] | null {
  const s = getMockState();
  // A project or task syncs both ways (OQ-172); a day pushes its logs and any unlinked parents.
  const mode = target.type === "day" ? "push" : "sync";
  const items: Item[] = [];
  const keys = new Set<string>();
  // OQ-204: the preview reads only linked PMSPA records, so candidates are fetched when a dropdown opens
  // (`candidates: null`). A project sync of a linked project reads that project's tasks: they are its tasks'
  // candidates.
  const listed =
    target.type === "project"
      ? (byPm4("project", target.id)?.pmspaId ?? null)
      : null;
  const projectRow = (p: Project, parentOf?: string) => {
    const key = `project:${p.id}`;
    if (keys.has(key)) return key;
    keys.add(key);
    const l = byPm4("project", p.id);
    const warnings: string[] = [];
    if (p.title.length > 150)
      warnings.push("Title over 150 characters: cut to 149 + “…”.");
    if ((p.description ?? "").length > 350)
      warnings.push("Description over 350 characters: cut to 349 + “…”.");
    const remoteProject = l
      ? remote.projects.find((x) => x.id === l.pmspaId)
      : undefined;
    items.push(
      row({
        key,
        type: "project",
        title: p.title,
        detail: leadDetail(p.projectLead?.name),
        ...(l && remoteProject
          ? pairAction(l, projectDiff(p, remoteProject))
          : createAction(mode)),
        ...(parentOf && !l ? { reason: parentOf, parent: true } : {}),
        linkedId: l?.pmspaId ?? null,
        candidates: l ? [] : null,
        warnings
      })
    );
    return key;
  };
  const taskRow = (
    t: Task,
    opts: { optional?: boolean; parentOf?: string }
  ) => {
    const key = `task:${t.id}`;
    if (keys.has(key)) return key;
    const project = s.projects.find((p) => p.id === t.project.id);
    const parentKey = project
      ? projectRow(
          project,
          byPm4("project", project.id) ? undefined : "Parent of the pushed task"
        )
      : null;
    keys.add(key);
    const l = byPm4("task", t.id);
    const warnings: string[] = [];
    if (t.title.length > 150)
      warnings.push("Title over 150 characters: cut to 149 + “…”.");
    if ((t.description ?? "").length > 350)
      warnings.push("Description over 350 characters: cut to 349 + “…”.");
    const remoteTask = l ? taskOf(l.pmspaId) : null;
    items.push(
      row({
        key,
        parentKey,
        type: "task",
        title: t.title,
        detail: COLUMN[t.status],
        ...(l && remoteTask
          ? pairAction(l, taskDiff(t, remoteTask))
          : createAction(mode)),
        ...(opts.parentOf && !l ? { reason: opts.parentOf, parent: true } : {}),
        optional: Boolean(opts.optional),
        linkedId: l?.pmspaId ?? null,
        candidates: l
          ? []
          : listed && t.project.id === target.id
            ? pmspaTaskCandidates(t).filter((c) => c.groupId === listed)
            : null,
        warnings
      })
    );
    return key;
  };

  if (target.type === "project") {
    const p = s.projects.find((x) => x.id === target.id);
    if (!p) return null;
    projectRow(p);
    for (const t of s.tasks.filter((x) => x.project.id === p.id))
      taskRow(t, { optional: true });
    return items;
  }
  if (target.type === "task") {
    const t = s.tasks.find((x) => x.id === target.id);
    if (!t) return null;
    taskRow(t, {});
    return items;
  }
  const date = target.id;
  const groups = groupDay(date);
  if (groups.length === 0) return [];
  // A PMSPA event can point at a task only: an unlinked task comes first, under its project. A project's
  // logs without a task go to an event without a task, so the project itself isn't pushed.
  for (const g of groups) {
    const t = g.task && s.tasks.find((x) => x.id === g.task!.id);
    if (t && !byPm4("task", t.id))
      taskRow(t, { parentOf: "Parent of the day's logs" });
  }
  const all = groups.flatMap((g) => g.logs);
  const dayKey = `day:${date}`;
  const linkedAll = all.map((l) => byPm4("time-log", l.id));
  items.push(
    row({
      key: dayKey,
      type: "day",
      title: formatWorkDate(date),
      detail: `${plural(groups.length, "event")} · ${eventDetail(
        all.length,
        all.reduce((x, l) => x + l.durationMinutes, 0)
      )}`,
      action: linkedAll.every(Boolean)
        ? linkedAll.some((l) => l!.pm4Changed)
          ? "update"
          : "skip"
        : linkedAll.some(Boolean)
          ? "update"
          : "create",
      reason:
        linkedAll.every(Boolean) && !linkedAll.some((l) => l!.pm4Changed)
          ? "No changes since the last sync"
          : null
    })
  );
  for (const g of groups) {
    const links = g.logs.map((l) => byPm4("time-log", l.id));
    const warnings: string[] = [];
    const long = g.logs.filter((l) => l.text.length > 350).length;
    if (long)
      warnings.push(
        `${plural(long, "log text")} over 350 characters: cut to 349 + “…”.`
      );
    const moved = g.logs.filter((l, i) => {
      const remoteEvent =
        links[i] &&
        remote.events.find((e) =>
          e.logs.some((x) => x.id === links[i]!.pmspaId)
        );
      const want = g.task ? byPm4("task", g.task.id)?.pmspaId : null;
      return remoteEvent && remoteEvent.taskId !== (want ?? null);
    });
    if (moved.length)
      warnings.push(
        `${plural(moved.length, "log")} moves here in PMSPA from another event; an event left empty is deleted.`
      );
    if (g.note) warnings.push(g.note);
    items.push(
      row({
        key: `event:${g.key}`,
        parentKey: dayKey,
        type: "event",
        title: g.title,
        ...(pushedTaskPath(g) ? { taskPath: pushedTaskPath(g)! } : {}),
        detail: `${pushedTaskPath(g) ? "" : `${pushedNoTask(g)} · `}${eventDetail(
          g.logs.length,
          g.logs.reduce((x, l) => x + l.durationMinutes, 0)
        )}`,
        action: links.every(Boolean)
          ? links.some((l) => l!.pm4Changed)
            ? "update"
            : "skip"
          : links.some(Boolean)
            ? "update"
            : "create",
        reason:
          links.every(Boolean) && !links.some((l) => l!.pm4Changed)
            ? "No changes since the last sync"
            : null,
        warnings
      })
    );
  }
  return items;
}

export function runPush(
  target: PmspaSyncTargetDto | PmspaPushTargetDto,
  choices: SyncChoiceDto[]
): SyncResultDto | null {
  const items = pushPreview(target);
  if (!items) return null;
  const now = new Date().toISOString();
  const out: SyncResultItemDto[] = [];
  const s = getMockState();
  for (const item of items) {
    const choice = choiceFor(choices, item);
    const [, id] = item.key.split(/:(.*)/);
    if (choice.kind === "skip" || item.action === "skip") {
      out.push(result(item, "skipped", item.reason ?? "Left out"));
      continue;
    }
    if (item.type === "project" || item.type === "task") {
      out.push(syncPair(item, choice, "pm4", now));
      continue;
    }
    if (item.type === "day") {
      const start = s.starts[id];
      if (start !== undefined)
        remote = { ...remote, starts: { ...remote.starts, [id]: start } };
      out.push(result(item, item.action === "create" ? "created" : "updated"));
    } else {
      const date = target.id;
      const g = groupDay(date).find((x) => `event:${x.key}` === item.key)!;
      if (g.title.length < 3) {
        out.push(
          result(
            item,
            "failed",
            "PMSPA rejected the event: the title must be 3 to 150 characters (ERR_VALIDATION)."
          )
        );
        continue;
      }
      const taskId = g.task
        ? (byPm4("task", g.task.id)?.pmspaId ?? null)
        : null;
      if (g.task && !taskId) {
        out.push(
          result(item, "failed", "Its task isn't in PMSPA (it was left out).")
        );
        continue;
      }
      // Logs leave their old events; an event left without logs is deleted (OQ-162).
      const pushedIds = new Set(
        g.logs.map((l) => byPm4("time-log", l.id)?.pmspaId).filter(Boolean)
      );
      let events = remote.events
        .map((e) => ({
          ...e,
          logs: e.logs.filter((l) => !pushedIds.has(l.id))
        }))
        .filter((e) => e.logs.length > 0);
      const existing = events.find(
        (e) =>
          e.date === date &&
          e.taskId === taskId &&
          (taskId || e.title === g.title)
      );
      const event = existing ?? {
        id: oid(),
        date,
        title: g.title,
        taskId,
        booked: false,
        logs: []
      };
      const newLogs = g.logs.map((l) => {
        const pmspaId = byPm4("time-log", l.id)?.pmspaId ?? oid();
        setLink("time-log", l.id, pmspaId, now, "pushed");
        return {
          id: pmspaId,
          title: cut(l.text, 350),
          duration: l.durationMinutes / 60
        };
      });
      // Bookings aren't synced with PMSPA: the event's booked flag stays as PMSPA has it.
      const updated = { ...event, logs: [...event.logs, ...newLogs] };
      events = existing
        ? events.map((e) => (e.id === existing.id ? updated : e))
        : [...events, updated];
      remote = { ...remote, events };
      out.push(result(item, item.action === "create" ? "created" : "updated"));
    }
  }
  lastSyncAt = now;
  return { items: out, syncedAt: now };
}
