// Seed data of the UI prototype. Dates are relative to today in the mock user's time zone; the generated
// history is deterministic (seeded PRNG), so every reload shows the same data.
import { addDays, format } from "date-fns";
import type { components } from "@/lib/api/schema";
import { today } from "@/lib/time";
import type { ProjectRef, TaskRef, TimeLog } from "@/proto/features/time/types";

type Me = components["schemas"]["MeResponseDto"];
type Project = components["schemas"]["ProjectResponseDto"];
type Task = components["schemas"]["TaskResponseDto"];
type Status = components["schemas"]["TaskStatus"];

export const MOCK_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

const now = new Date().toISOString();

/** The fixed signed-in user: the prototype has no sign-in. */
export const MOCK_USER: Me = {
  id: "u-mock",
  email: "mock.user@example.com",
  displayName: "Mock User",
  avatarUrl: null,
  timeZone: MOCK_TZ,
  dailyTargetMinutes: 420,
  createdAt: now
};

const lead = {
  kind: "user" as const,
  user: {
    id: MOCK_USER.id,
    displayName: MOCK_USER.displayName,
    avatarUrl: null
  },
  name: MOCK_USER.displayName
};

export const MOCK_PROJECTS: ProjectRef[] = [
  { id: "p-internal", title: "PM Internal" },
  { id: "p-anthropic", title: "Anthropic" },
  { id: "p-nvidia", title: "Nvidia" },
  { id: "p-tesla", title: "Tesla" }
];
const proj = (id: string) => MOCK_PROJECTS.find((p) => p.id === id)!;
export const MOCK_TASKS: TaskRef[] = [
  { id: "t-anthropic-pm", title: "PM", project: proj("p-anthropic") },
  { id: "t-anthropic-meet", title: "Meetings", project: proj("p-anthropic") },
  { id: "t-nvidia-pm", title: "PM", project: proj("p-nvidia") },
  { id: "t-nvidia-dev", title: "Development", project: proj("p-nvidia") },
  { id: "t-tesla-meet", title: "Meetings", project: proj("p-tesla") },
  { id: "t-tesla-qa", title: "QA", project: proj("p-tesla") }
];

const STATUSES: Status[] = ["upcoming", "in-progress", "completed"];

/** The API shapes of the projects and tasks above (task counts and logged minutes are computed by the mock client). */
export const seedProjects = (): Project[] =>
  MOCK_PROJECTS.map((p) => ({
    id: p.id,
    title: p.title,
    description: null,
    externalLink: null,
    projectLead: lead,
    taskCounts: { upcoming: 0, inProgress: 0, completed: 0, total: 0 },
    loggedMinutes: 0,
    createdAt: now,
    updatedAt: now
  }));

export const seedTasks = (): Task[] =>
  MOCK_TASKS.map((t, i) => ({
    id: t.id,
    title: t.title,
    description: null,
    externalLink: null,
    projectLead: lead,
    status: STATUSES[i % 3],
    dueDate: i % 2 ? format(addDays(new Date(), i), "yyyy-MM-dd") : null,
    project: { id: t.project.id, title: t.project.title, deleted: false },
    loggedMinutes: 0,
    createdAt: now,
    updatedAt: now
  }));

export interface TimeSeed {
  logs: TimeLog[];
  /** date → start minute of the workday. */
  starts: Record<string, number>;
  /** logId → the date the log is booked to (Bookings). */
  bookings: Record<string, string>;
}

const todayStr = today(MOCK_TZ);
const ago = (n: number) =>
  format(addDays(new Date(todayStr + "T12:00:00"), -n), "yyyy-MM-dd");
const ref = (p: ProjectRef) => ({ id: p.id, title: p.title, deleted: false });
const taskRef = (t: TaskRef) => ({ id: t.id, title: t.title, deleted: false });
/** A link to a deleted task or project: the log keeps its name (FR-TLOG-014). */
const deletedRef = (title: string) => ({ id: null, title, deleted: true });
let n = 0;
const seed = (
  workDate: string,
  durationMinutes: number,
  text: string,
  title: string | null,
  task?: string,
  project?: string,
  excludeFromStats = false
): TimeLog => {
  const t = MOCK_TASKS.find((x) => x.id === task);
  const p = t ? t.project : MOCK_PROJECTS.find((x) => x.id === project);
  return {
    id: `l${++n}`,
    workDate,
    durationMinutes,
    text,
    title,
    project: p ? ref(p) : null,
    task: t ? taskRef(t) : null,
    excludeFromStats
  };
};

const recent: TimeSeed = {
  bookings: {},
  starts: {
    [todayStr]: 8 * 60,
    [ago(1)]: 9 * 60,
    [ago(2)]: 8 * 60 + 30,
    [ago(5)]: 9 * 60
  },
  logs: [
    seed(
      todayStr,
      75,
      "Resourcing meet s PMovima, Team Leadovima i Jane",
      "Office",
      undefined,
      "p-internal"
    ),
    seed(
      todayStr,
      15,
      "Sync s ljudima nakon meeta, call s Johnom za broj Nvidia pageva.",
      "Office",
      undefined,
      "p-internal"
    ),
    seed(
      todayStr,
      15,
      "Syncovi s timovima u uredu kroz dan.",
      "Office",
      undefined,
      "p-internal"
    ),
    seed(
      todayStr,
      90,
      "Sync s Jane za tekuće stvari u uredu.",
      "Office",
      undefined,
      "p-internal"
    ),
    seed(todayStr, 60, "put", "nonprod", undefined, undefined, true),
    seed(
      todayStr,
      15,
      "Check šta je Mark slao na kanal, pripreme prije calla s Anthropicom.",
      "Anthropic",
      "t-anthropic-pm"
    ),
    seed(
      todayStr,
      15,
      "Sync s Markom i Tomom nakon calla s Googleom",
      "Anthropic",
      "t-anthropic-pm"
    ),
    seed(
      todayStr,
      75,
      "Call s Googleom i Anthropicom tjedni",
      "Anthropic",
      "t-anthropic-meet"
    ),
    seed(
      todayStr,
      45,
      "Call s Johnom za koliko je pageva odrađeno, izvuć brojke, align s Bobom.",
      "Nvidia",
      "t-nvidia-pm"
    ),
    seed(todayStr, 30, "Weekly s Peterom.", "Tesla", "t-tesla-meet"),
    seed(todayStr, 45, "Weekly s Tesla timom.", "Tesla", "t-tesla-meet"),
    seed(todayStr, 15, "Sync s Annom nakon za QA.", "Tesla", "t-tesla-meet"),
    // A deleted task of a live project: the task is plain text with the marker, the project a link.
    {
      ...seed(
        todayStr,
        30,
        "Wrapped up the audit notes.",
        "Audit",
        undefined,
        "p-nvidia"
      ),
      task: deletedRef("Security audit")
    },
    seed(
      ago(1),
      120,
      "Build planning and estimates for the next sprint.",
      "Planning",
      "t-nvidia-pm"
    ),
    seed(ago(1), 60, "Reviewed pull requests.", null, undefined, "p-nvidia"),
    seed(ago(1), 90, "Test pass on the new release.", "QA", "t-tesla-qa"),
    seed(ago(1), 45, "Planning call with the team.", null),
    // A deleted project and its deleted task, and one of its logs without a task.
    {
      ...seed(
        ago(1),
        60,
        "Handover of the old website to the client.",
        "Handover"
      ),
      project: deletedRef("Old Website"),
      task: deletedRef("Launch")
    },
    {
      ...seed(ago(1), 30, "Final invoice for the old website.", null),
      project: deletedRef("Old Website")
    },
    seed(
      ago(2),
      240,
      "Feature work on the import pipeline.",
      null,
      "t-nvidia-dev"
    ),
    seed(
      ago(2),
      135,
      "Weekly meetings and follow-ups.",
      "Meetings",
      "t-anthropic-meet"
    ),
    seed(
      ago(5),
      180,
      "Interviews for the backend position.",
      "Interviews",
      undefined,
      "p-internal"
    )
  ]
};

/**
 * ~11 weeks of weekday history before the hand-written days above (the Dashboard needs a filled month).
 * Older logs are mostly booked to their own day, recent ones mostly not.
 */
function withHistory(s: TimeSeed): TimeSeed {
  let r = 20261009;
  const rand = () => {
    r = (r + 0x6d2b79f5) | 0;
    let t = Math.imul(r ^ (r >>> 15), 1 | r);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const WORK: [string, string | undefined, string | undefined][] = [
    ["Sprint planning and estimates.", "t-nvidia-pm", undefined],
    ["Feature work on the import pipeline.", "t-nvidia-dev", undefined],
    ["Code review and fixes.", "t-nvidia-dev", undefined],
    ["Weekly call with the client.", "t-anthropic-meet", undefined],
    ["Backlog grooming and tickets.", "t-anthropic-pm", undefined],
    ["Regression test pass.", "t-tesla-qa", undefined],
    ["Weekly sync with the team.", "t-tesla-meet", undefined],
    ["Resourcing and team syncs.", undefined, "p-internal"],
    ["Interviews and hiring.", undefined, "p-internal"],
    ["Emails and admin.", undefined, undefined]
  ];
  const starts = { ...s.starts };
  const bookings = { ...s.bookings };
  const logs = [...s.logs];
  for (let back = 80; back >= 3; back--) {
    const date = ago(back);
    const dow = new Date(date + "T12:00:00").getDay();
    if (dow === 0 || dow === 6 || starts[date] !== undefined) continue;
    if (rand() < 0.08) continue; // a day off
    starts[date] = 7 * 60 + 30 + Math.floor(rand() * 11) * 15; // 07:30–10:00
    let left = (22 + Math.floor(rand() * 15)) * 15; // 5h30–9h
    while (left > 0) {
      const minutes = Math.min(left, (1 + Math.floor(rand() * 8)) * 15);
      left -= minutes;
      const [text, task, project] = pick(WORK);
      const log = seed(date, minutes, text, null, task, project, rand() < 0.04);
      logs.push(log);
      const bookChance = back > 14 ? 0.92 : back > 6 ? 0.55 : 0.1;
      if (!log.excludeFromStats && log.project && rand() < bookChance) {
        bookings[log.id] = rand() < 0.1 ? ago(back - 1) : date;
      }
    }
  }
  return { starts, bookings, logs };
}

export const seedTime = (): TimeSeed => withHistory(recent);
