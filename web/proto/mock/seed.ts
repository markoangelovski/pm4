// Seed data of the UI prototype. Dates are relative to today in the mock user's time zone; the generated
// history is deterministic (seeded PRNG), so every reload shows the same data.
import { addDays, format } from "date-fns";
import type { components } from "@/lib/api/schema";
import { today } from "@/lib/time";
import type { ProjectRef, TaskRef, TimeLog } from "@/proto/features/time/types";
import type { NoteDto, TodoDto } from "@/proto/features/notes/types";

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

/** Some projects and tasks link out (to a board); the rest have no link. */
const PROJECT_LINKS: Record<string, string> = {
  "p-anthropic": "https://kanboard.example.com/project/12",
  "p-nvidia": "https://kanboard.example.com/project/27"
};
const TASK_LINKS: Record<string, string> = {
  "t-anthropic-pm": "https://kanboard.example.com/task/1041",
  "t-nvidia-dev": "https://kanboard.example.com/task/2210"
};

const STATUSES: Status[] = ["upcoming", "in-progress", "completed"];

/** The API shapes of the projects and tasks above (task counts and logged minutes are computed by the mock client). */
export const seedProjects = (): Project[] =>
  MOCK_PROJECTS.map((p) => ({
    id: p.id,
    title: p.title,
    description: null,
    externalLink: PROJECT_LINKS[p.id] ?? null,
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
    externalLink: TASK_LINKS[t.id] ?? null,
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
  /** logId → the log's bookings, by date (Bookings). */
  bookings: Record<string, { date: string; minutes: number }[]>;
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
  // Partial bookings (ids follow the order of `logs` below): split across two days, partly booked, fully booked.
  bookings: {
    l9: [{ date: todayStr, minutes: 45 }],
    l14: [{ date: ago(1), minutes: 60 }],
    l20: [
      { date: ago(2), minutes: 120 },
      { date: ago(1), minutes: 60 }
    ],
    l21: [{ date: ago(2), minutes: 135 }],
    l22: [
      { date: ago(5), minutes: 90 },
      { date: ago(4), minutes: 90 }
    ]
  },
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
        const roll = rand();
        const half = Math.floor(minutes / 30) * 15;
        bookings[log.id] =
          roll < 0.08
            ? [{ date: ago(back - 1), minutes }]
            : roll < 0.16 && half > 0
              ? // Partly booked: half to the day, half to the next day (or left unbooked).
                rand() < 0.5
                ? [
                    { date, minutes: half },
                    { date: ago(back - 1), minutes: minutes - half }
                  ]
                : [{ date, minutes: half }]
              : [{ date, minutes }];
      }
    }
  }
  return { starts, bookings, logs };
}

export const seedTime = (): TimeSeed => withHistory(recent);

/** An instant `days` days and `hours` hours before now (notes and to-dos). */
const before = (days: number, hours = 0) =>
  new Date(Date.now() - (days * 24 + hours) * 3_600_000).toISOString();
/** The links of a note or to-do: a task (and its project), a project, or none. */
const linkTo = (task?: string, project?: string) => {
  const t = MOCK_TASKS.find((x) => x.id === task);
  const p = t ? t.project : MOCK_PROJECTS.find((x) => x.id === project);
  return { project: p ? ref(p) : null, task: t ? taskRef(t) : null };
};

const RELEASE_NOTE = `## Before the release

- [x] Freeze the feature branch
- [x] Run the full regression suite
- [ ] Update the **changelog**
- [ ] Tell support about the new *export* option

## Rollback

1. Revert the deploy in the pipeline
2. Restore the database snapshot
3. Post in the release channel

> Releases go out on Tuesdays only.

Release command: \`npm run release -- --tag next\``;

const API_NOTE = `### API integration

The partner API answers **429** after 100 requests per 15 minutes, so the client keeps its own budget.

| Endpoint | Paged | Notes |
| --- | --- | --- |
| \`/orders\` | yes | max 50 per page |
| \`/customers\` | yes | sort by \`updatedAt\` |
| \`/days\` | no | by date range |

\`\`\`ts
const res = await client.GET("/orders", { params: { query: { skip, limit: 50 } } });
\`\`\`

Open points:

- Do they send \`Retry-After\` on every 429?
- Time zone of \`dueDate\` is unknown, so we send epoch milliseconds.

See the [API docs](https://example.com/docs) for the full list. Long notes are clamped in lists and open in full with **Show more**: this paragraph is here to make the note long enough. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`;

/** Notes: untitled, unlinked, Markdown-rich, long, on a task, on a project, on a deleted project. */
export const seedNotes = (): NoteDto[] => [
  {
    id: "n1",
    title: null,
    body: "Call the accountant about the **Q4 invoices** before Friday.",
    ...linkTo(),
    createdAt: before(0, 2),
    updatedAt: before(0, 2)
  },
  {
    id: "n6",
    title: "Reading list",
    body: "- *Shape Up*, Ryan Singer\n- *The Mythical Man-Month*, Fred Brooks\n- [Postgres docs on indexes](https://www.postgresql.org/docs/current/indexes.html)",
    ...linkTo(),
    createdAt: before(4),
    updatedAt: before(2)
  },
  {
    id: "n7",
    title: "Ideas for next quarter",
    body: "1. Weekly review on Fridays\n2. Fewer meetings on Tuesdays\n3. Try time-boxing the support inbox",
    ...linkTo(),
    createdAt: before(15),
    updatedAt: before(15)
  },
  {
    id: "n2",
    title: "Release checklist",
    body: RELEASE_NOTE,
    ...linkTo(undefined, "p-anthropic"),
    createdAt: before(6),
    updatedAt: before(1)
  },
  {
    id: "n3",
    title: "API integration notes",
    body: API_NOTE,
    ...linkTo("t-nvidia-dev"),
    createdAt: before(12),
    updatedAt: before(3)
  },
  {
    id: "n4",
    title: "Test accounts",
    body: "Staging users are in the shared vault, entry *QA staging*.\nReset them every Monday.",
    ...linkTo("t-tesla-qa"),
    createdAt: before(20),
    updatedAt: before(20)
  },
  {
    id: "n5",
    title: "Old website handover",
    body: "DNS moved to the new provider. Nothing else left.",
    project: deletedRef("Old Website"),
    task: null,
    createdAt: before(40),
    updatedAt: before(40)
  }
];

const todo = (
  id: string,
  text: string,
  link: ReturnType<typeof linkTo>,
  age: number,
  doneAgo: number | null = null
): TodoDto => ({
  id,
  text,
  doneAt: doneAgo === null ? null : before(doneAgo),
  ...link,
  createdAt: before(age),
  updatedAt: before(age)
});

/** To-dos: general, on projects, on tasks, done, long, on a deleted task. */
export const seedTodos = (): TodoDto[] => [
  todo("td1", "Renew the domain", linkTo(), 9),
  todo("td2", "Book the team lunch", linkTo(), 8, 2),
  {
    ...todo(
      "td3",
      "Send the weekly report",
      linkTo(undefined, "p-anthropic"),
      7
    ),
    updatedAt: before(1)
  },
  todo(
    "td4",
    "Prepare the demo for Thursday",
    linkTo(undefined, "p-anthropic"),
    5
  ),
  todo("td5", "Update the roadmap", linkTo("t-anthropic-pm"), 6),
  todo("td6", "Review the budget", linkTo("t-anthropic-pm"), 10, 1),
  todo(
    "td7",
    "Fix the flaky checkout test in CI: it fails about once in ten runs on the payment step, probably a race between the mock server and the first request",
    linkTo("t-nvidia-dev"),
    4
  ),
  todo("td8", "Ask for API keys for staging", linkTo("t-nvidia-dev"), 3),
  todo("td9", "Write the test plan", linkTo("t-tesla-qa"), 2),
  {
    ...todo("td10", "Close the audit findings", linkTo(), 30),
    project: ref(MOCK_PROJECTS.find((p) => p.id === "p-anthropic")!),
    task: deletedRef("Security audit")
  }
];
