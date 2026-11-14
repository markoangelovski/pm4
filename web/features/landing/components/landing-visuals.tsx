import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  RefreshCw
} from "lucide-react";
import { formatDuration } from "@/lib/time";
import { cn } from "@/lib/utils";
import { DurationTry } from "./landing-interactive";
import {
  SAMPLE_DAY,
  SAMPLE_PROJECT_HOURS,
  SAMPLE_PROJECTS,
  SAMPLE_WORKDAYS
} from "./landing-sample";
import { Dot, FauxButton, ProjectAvatar } from "./landing-screens";

/**
 * Detail pictures for the landing page's feature sections (FR-LAND-001): parts of PM4's screens, drawn with the
 * app's tokens and the sample content. Server components; only the duration field inside the log form is live.
 */

/** The card every picture sits in. */
export function Panel({
  label,
  children,
  className
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <figure
      aria-label={label}
      className={cn(
        "min-w-0 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-[0_16px_40px_-24px_rgb(0_0_0/0.25)] sm:p-5",
        className
      )}
    >
      {children}
    </figure>
  );
}

function FauxField({
  label,
  children,
  className
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <span
        className={cn(
          "flex min-h-9 items-center rounded-md border border-input px-3 py-1.5 text-sm",
          className
        )}
      >
        {children}
      </span>
    </div>
  );
}

/** The Log time dialog: the required log text, the live duration field, recent projects, non-prod. */
export function LogTimeForm() {
  return (
    <Panel label="PM4's Log time dialog, with a duration field you can try">
      <p className="text-base font-semibold tracking-tight">Log time</p>
      <p className="text-sm text-muted-foreground">Record time you worked.</p>
      <div className="mt-4 flex flex-col gap-4">
        <FauxField label="Log text">
          Fix address validation on the checkout form
        </FauxField>
        <DurationTry />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            Project{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </span>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Recent projects</span>
            {(["orbit", "atlas", "internal"] as const).map((key, i) => (
              <span
                key={key}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2 py-0.5",
                  i === 0 ? "border-foreground" : "border-border"
                )}
              >
                <ProjectAvatar
                  color={SAMPLE_PROJECTS[key].color}
                  className="size-2.5 rounded-[3px]"
                />
                {SAMPLE_PROJECTS[key].name}
              </span>
            ))}
          </div>
        </div>
        <span className="flex items-center gap-2 text-sm">
          <span
            aria-hidden
            className="size-4 rounded-[4px] border border-input"
          />
          Exclude from statistics
        </span>
      </div>
    </Panel>
  );
}

/** The header bell: the reminder to log, and the desktop notification switch. */
export function ReminderCard() {
  return (
    <Panel label="PM4's reminder to log time">
      <div className="flex items-start gap-3">
        <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-border">
          <Bell className="size-4" aria-hidden />
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-[var(--lp-start)] ring-2 ring-card"
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Log your time</p>
          <p className="text-sm text-muted-foreground">
            1h 15m left to log today. Started 08:00, logged 6h 45m.
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3 text-sm">
        <span>Remind me to log time</span>
        <span
          aria-hidden
          className="flex h-5 w-9 items-center justify-end rounded-full bg-primary p-0.5"
        >
          <span className="size-4 rounded-full bg-primary-foreground" />
        </span>
      </div>
    </Panel>
  );
}

/** One log booked across two dates, and where each part went. */
export function BookingSplit() {
  const parts = [
    { date: "3 Nov 2026", time: "1h 15m", own: true },
    { date: "4 Nov 2026", time: "45m", own: false }
  ];
  return (
    <Panel label="A time log booked to two dates in PM4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <ProjectAvatar color={SAMPLE_PROJECTS.orbit.color} />
          <span className="truncate">Fix address validation · 2h</span>
        </span>
        <span className="rounded-full bg-[var(--lp-booked)]/15 px-2 py-0.5 text-xs font-medium text-[var(--lp-booked)]">
          Booked 2h of 2h
        </span>
      </div>
      <ul className="mt-3 flex flex-col gap-2 text-xs">
        {parts.map((p) => (
          <li
            key={p.date}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2"
          >
            <FauxButton>
              <CalendarDays className="size-3.5" aria-hidden />
              {p.date}
            </FauxButton>
            <span className="truncate text-muted-foreground">
              {p.own ? "The day it was worked" : "Booked to another day"}
            </span>
            <span
              className={cn(
                "rounded-md px-2 py-1 font-medium tabular-nums",
                p.own
                  ? "bg-[var(--lp-booked)]/15 text-[var(--lp-booked)]"
                  : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
              )}
            >
              {p.time}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
        <ArrowRight className="size-3.5" aria-hidden />
        Wednesday shows 45m as booked from another day.
      </p>
    </Panel>
  );
}

/** Dashboard: worked, target and booked added up day by day. */
export function RunningTotals() {
  const width = 300;
  const height = 120;
  const left = 4;
  const right = width - 4;
  const top = 8;
  const bottom = height - 16;
  const days = SAMPLE_WORKDAYS.length;
  const max = days * SAMPLE_DAY.target;
  const x = (i: number) => left + ((right - left) * i) / (days - 1);
  const y = (min: number) => bottom - (min / max) * (bottom - top);
  const cumulative = (pick: (d: (typeof SAMPLE_WORKDAYS)[number]) => number) =>
    SAMPLE_WORKDAYS.reduce<number[]>(
      (acc, d) => [...acc, (acc.at(-1) ?? 0) + pick(d)],
      []
    );
  const line = (values: number[]) =>
    values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");
  const worked = cumulative((d) => d.booked + d.unbooked);
  const booked = cumulative((d) => d.booked);
  const target = cumulative(() => SAMPLE_DAY.target);

  return (
    <Panel label="PM4's running totals chart">
      <p className="text-sm font-medium">Running totals</p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-2 w-full"
        role="img"
        aria-label="Worked, target and booked hours added up day by day"
      >
        {[0, 0.5, 1].map((f) => (
          <line
            key={f}
            x1={left}
            x2={right}
            y1={y(max * f)}
            y2={y(max * f)}
            stroke="var(--border)"
          />
        ))}
        <path
          d={`${line(worked)} L${x(days - 1)},${bottom} L${x(0)},${bottom} Z`}
          fill="var(--lp-worked)"
          opacity="0.1"
        />
        <path
          d={line(target)}
          fill="none"
          stroke="var(--foreground)"
          strokeDasharray="3 3"
        />
        <path
          d={line(worked)}
          fill="none"
          stroke="var(--lp-worked)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d={line(booked)}
          fill="none"
          stroke="var(--lp-booked)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {SAMPLE_WORKDAYS.map((d, i) => (
          <text
            key={d.day}
            x={x(i)}
            y={height - 3}
            textAnchor={i === 0 ? "start" : i === days - 1 ? "end" : "middle"}
            fontSize="8"
            fill="var(--muted-foreground)"
          >
            {d.day}
          </text>
        ))}
      </svg>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <Dot color="var(--lp-worked)" />
          Worked {formatDuration(worked.at(-1) ?? 0)}
        </li>
        <li className="flex items-center gap-1.5">
          <Dot color="var(--lp-booked)" />
          Booked {formatDuration(booked.at(-1) ?? 0)}
        </li>
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="w-3 border-t border-dashed border-foreground"
          />
          Target {formatDuration(max)}
        </li>
      </ul>
    </Panel>
  );
}

/** Dashboard: every project with hours in the range, most first, with its booked share. */
export function HoursByProject() {
  const max = SAMPLE_PROJECT_HOURS[0].minutes;
  return (
    <Panel label="PM4's hours by project">
      <p className="text-sm font-medium">Hours by project</p>
      <ul className="mt-3 flex flex-col gap-3 text-xs">
        {SAMPLE_PROJECT_HOURS.map(({ project, minutes, booked }) => (
          <li key={project} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <ProjectAvatar color={SAMPLE_PROJECTS[project].color} />
              <span className="truncate font-medium">
                {SAMPLE_PROJECTS[project].name}
              </span>
              <span className="ml-auto shrink-0 tabular-nums">
                {formatDuration(minutes)}
              </span>
              <span className="w-20 shrink-0 text-right text-muted-foreground tabular-nums">
                {formatDuration(booked)} booked
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-[var(--lp-worked)]"
                style={{ width: `${(minutes / max) * 100}%` }}
              >
                <div
                  className="h-full rounded-full bg-[var(--lp-booked)]"
                  style={{ width: `${(booked / minutes) * 100}%` }}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** The task list: status changed in place, due-date warnings, logged time. */
export function TasksPicture() {
  const tasks = [
    {
      title: "Checkout",
      project: "orbit",
      status: "In progress",
      due: "30 Oct 2026",
      badge: "Overdue",
      logged: "38h 15m"
    },
    {
      title: "Launch",
      project: "atlas",
      status: "Upcoming",
      due: "5 Nov 2026",
      badge: "Due soon",
      logged: "12h"
    },
    {
      title: "Payments refactor",
      project: "orbit",
      status: "Upcoming",
      due: "27 Nov 2026",
      badge: null,
      logged: "—"
    },
    {
      title: "Content model",
      project: "atlas",
      status: "Completed",
      due: null,
      badge: null,
      logged: "21h 30m"
    }
  ] as const;
  return (
    <Panel label="PM4's task list">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {["Upcoming", "In progress", "Completed"].map((s, i) => (
          <span
            key={s}
            className={cn(
              "rounded-md border px-2 py-1",
              i < 2
                ? "border-foreground bg-foreground text-background"
                : "border-border"
            )}
          >
            {s}
          </span>
        ))}
        <FauxButton className="ml-auto">
          Title A–Z
          <ChevronDown className="size-3" aria-hidden />
        </FauxButton>
      </div>
      <ul className="mt-3 flex flex-col divide-y divide-border text-xs">
        {tasks.map((t) => (
          <li
            key={t.title}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto_7.5rem_3.5rem]"
          >
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{t.title}</span>
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <ProjectAvatar
                  color={SAMPLE_PROJECTS[t.project].color}
                  className="size-2.5 rounded-[3px]"
                />
                {SAMPLE_PROJECTS[t.project].name}
              </span>
            </span>
            <FauxButton>
              {t.status}
              <ChevronDown className="size-3" aria-hidden />
            </FauxButton>
            <span className="flex flex-wrap items-center gap-1.5 tabular-nums">
              {t.due ?? <span className="text-muted-foreground">—</span>}
              {t.badge && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                    t.badge === "Overdue"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                  )}
                >
                  {t.badge}
                </span>
              )}
            </span>
            <span className="hidden text-right tabular-nums sm:block">
              {t.logged}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** A Markdown note and to-dos grouped by project and task. */
export function NotesPicture() {
  const groups = [
    {
      name: "General",
      color: null,
      items: [{ text: "Renew the domain before the 20th", done: false }]
    },
    {
      name: `${SAMPLE_PROJECTS.atlas.name} · Launch`,
      color: SAMPLE_PROJECTS.atlas.color,
      items: [
        { text: "Send the launch checklist to John", done: true },
        { text: "Set up redirects from the old blog", done: false }
      ]
    }
  ];
  return (
    <Panel label="PM4's notes and to-dos">
      <article
        className="rounded-lg border border-l-4 border-border p-3"
        style={{ borderLeftColor: SAMPLE_PROJECTS.orbit.color }}
      >
        <p className="text-sm font-semibold">Checkout edge cases</p>
        <p className="text-[11px] text-muted-foreground">
          {SAMPLE_PROJECTS.orbit.name} · Checkout · 3 Nov 2026
        </p>
        <ul className="mt-2 list-disc pl-4 text-xs leading-relaxed">
          <li>
            Postcodes with a space:{" "}
            <code className="rounded bg-muted px-1 font-mono">SW1A 1AA</code>
          </li>
          <li>
            <strong>Ask Jane</strong> about addresses without a street number
          </li>
        </ul>
      </article>

      <div className="mt-4 flex flex-col gap-3 text-xs">
        {groups.map((g) => (
          <div key={g.name}>
            <p className="mb-1.5 flex items-center gap-2 font-medium">
              {g.color && <ProjectAvatar color={g.color} className="size-3" />}
              {g.name}
              <span className="font-normal text-muted-foreground">
                {g.items.filter((it) => !it.done).length} open
              </span>
            </p>
            <ul className="flex flex-col gap-1.5">
              {g.items.map((it) => (
                <li key={it.text} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-[4px] border",
                      it.done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input"
                    )}
                  >
                    {it.done && <Check className="size-3" />}
                  </span>
                  <span
                    className={cn(
                      it.done && "text-muted-foreground line-through"
                    )}
                  >
                    {it.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/** The PMSPA connector: pick PMSPA projects and tasks to import, see what's already linked. */
export function PmspaPicture() {
  const rows = [
    { kind: "Project", name: "Orbit app", state: "linked" },
    { kind: "Task", name: "Checkout", state: "linked" },
    { kind: "Task", name: "Payments refactor", state: "selected" },
    { kind: "Task", name: "Push notifications", state: "selected" },
    { kind: "Task", name: "App store listing", state: "none" }
  ] as const;
  return (
    <Panel label="PM4's PMSPA connector">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
        <span className="flex items-center gap-1.5 rounded-full bg-[var(--lp-booked)]/15 px-2 py-0.5 font-medium text-[var(--lp-booked)]">
          <Dot color="var(--lp-booked)" className="size-1.5" />
          Connected
        </span>
        <span className="text-muted-foreground">37 of 100 requests used</span>
        <FauxButton primary className="ml-auto">
          Import 2 records
        </FauxButton>
      </div>
      <ul className="mt-3 flex flex-col divide-y divide-border rounded-lg border border-border text-xs">
        {rows.map((r) => (
          <li
            key={r.name}
            className={cn(
              "flex items-center gap-3 px-3 py-2",
              r.kind === "Task" && "pl-6"
            )}
          >
            <span
              aria-hidden
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-[4px] border",
                r.state === "selected"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input"
              )}
            >
              {r.state === "selected" && <Check className="size-3" />}
            </span>
            <span className="min-w-0 flex-1 truncate">
              <span className={cn(r.kind === "Project" && "font-medium")}>
                {r.name}
              </span>
            </span>
            {r.state === "linked" ? (
              <span className="flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5 text-[10px]">
                <RefreshCw className="size-2.5" aria-hidden />
                Linked
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground">
                Not linked
              </span>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">
          On a project, task or day:
        </span>
        <FauxButton>
          <RefreshCw className="size-3" aria-hidden />
          Sync with PMSPA
        </FauxButton>
        <FauxButton>Push to PMSPA</FauxButton>
      </div>
    </Panel>
  );
}
