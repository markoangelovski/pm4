import {
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  RefreshCw
} from "lucide-react";
import { formatDuration } from "@/lib/time";
import { cn } from "@/lib/utils";
import {
  DURATION_EXAMPLES,
  NON_PROD_COLOR,
  SAMPLE_DAY,
  SAMPLE_PROJECTS,
  SAMPLE_WORKDAYS,
  type SampleLog
} from "./landing-sample";

/**
 * Static illustrations of PM4 screens for the landing page (FR-LAND-001): drawn with the app's own tokens so they
 * follow light and dark, with sample content from `landing-sample.ts`. Server components, no data, no state.
 */

function clock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function logColor(log: SampleLog): string {
  if (log.excluded || log.project === null) return NON_PROD_COLOR;
  return SAMPLE_PROJECTS[log.project].color;
}

function Dot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2.5 shrink-0", className)}
      style={{ background: color }}
    />
  );
}

/** A screen frame: a top bar with the app route the illustration comes from. */
export function ScreenFrame({
  route,
  label,
  children,
  className
}: {
  route: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <figure
      aria-label={label}
      className={cn(
        "min-w-0 border border-border bg-card text-card-foreground shadow-[0_1px_0_0_var(--border),0_24px_48px_-24px_rgb(0_0_0/0.18)]",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <span className="font-mono text-[11px] tracking-wide text-muted-foreground">
          {route}
        </span>
        <span aria-hidden className="flex gap-1">
          <span className="h-1 w-3 bg-border" />
          <span className="h-1 w-3 bg-border" />
          <span className="h-1 w-3 bg-border" />
        </span>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </figure>
  );
}

function Figure({
  label,
  value,
  detail,
  large
}: {
  label: string;
  value: string;
  detail?: string;
  large?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-semibold tracking-tight tabular-nums",
          large ? "text-2xl sm:text-3xl" : "text-lg"
        )}
      >
        {value}
        {detail && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            {detail}
          </span>
        )}
      </span>
    </div>
  );
}

/** Hero: one workday as the logo's staggered bars, each log starting where the last one ended. */
export function DayTimeline() {
  const { start, now, target, logs } = SAMPLE_DAY;
  const axisEnd = now + 30;
  const span = axisEnd - start;
  const logged = logs.reduce((sum, l) => sum + l.minutes, 0);
  const billable = logs
    .filter((l) => !l.excluded)
    .reduce((sum, l) => sum + l.minutes, 0);
  const unlogged = Math.min(now - start - logged, target - billable);
  const pct = (m: number) => `${((m - start) / span) * 100}%`;
  const ticks = [8, 10, 12, 14, 16].map((h) => h * 60);

  const rows = logs.map((log, i) => ({
    log,
    from: start + logs.slice(0, i).reduce((sum, l) => sum + l.minutes, 0)
  }));

  return (
    <ScreenFrame route="/app/time" label="A workday in PM4's Logs screen">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">{SAMPLE_DAY.label}</p>
        <span className="font-mono text-[11px] text-muted-foreground">
          Daily target {formatDuration(target)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Figure label="Start" value={clock(start)} large />
        <Figure label="Logged" value={formatDuration(logged)} large />
        <Figure label="Start + logged" value={clock(start + logged)} large />
        <Figure
          label="Billable"
          value={formatDuration(billable)}
          detail={`${Math.round((billable / target) * 100)}%`}
          large
        />
      </div>

      <ol className="mt-6 flex flex-col gap-2.5">
        {rows.map(({ log, from }, i) => (
          <li key={log.text} className="flex flex-col gap-1">
            <div className="flex min-w-0 items-center gap-2 text-xs">
              <Dot color={logColor(log)} />
              <span className="truncate">
                {log.project && (
                  <span className="text-muted-foreground">
                    {SAMPLE_PROJECTS[log.project].name}
                    {log.task && ` · ${log.task}`} ·{" "}
                  </span>
                )}
                {log.text}
              </span>
              {log.excluded && (
                <span className="shrink-0 border border-border px-1 text-[10px] text-muted-foreground">
                  Non-prod
                </span>
              )}
              <span className="ml-auto shrink-0 font-mono tabular-nums text-muted-foreground">
                {formatDuration(log.minutes)}
              </span>
            </div>
            <div className="relative h-2 bg-muted">
              <span
                className="absolute inset-y-0 fill-mode-both motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-3 motion-safe:duration-500"
                style={{
                  left: pct(from),
                  width: `${(log.minutes / span) * 100}%`,
                  background: logColor(log),
                  animationDelay: `${150 + i * 90}ms`
                }}
              />
            </div>
          </li>
        ))}
      </ol>

      <div
        aria-hidden
        className="relative mt-2 h-4 font-mono text-[10px] text-muted-foreground"
      >
        {ticks.map((t, i) => (
          <span
            key={t}
            className={cn(
              "absolute tabular-nums",
              i === 0 ? "" : "-translate-x-1/2"
            )}
            style={{ left: pct(t) }}
          >
            {clock(t)}
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-3 text-xs">
        <span className="flex items-center gap-1.5 font-medium">
          <Bell className="size-3.5" aria-hidden />
          {formatDuration(unlogged)} left to log today
        </span>
        <span className="text-muted-foreground">Now {clock(now)}</span>
      </div>
    </ScreenFrame>
  );
}

/** The duration field: what you type, what's stored. */
export function DurationParser() {
  return (
    <ScreenFrame
      route="Log time · Duration"
      label="Duration inputs PM4 accepts"
    >
      <ul className="flex flex-col divide-y divide-border">
        {DURATION_EXAMPLES.map(({ input, result }) => (
          <li
            key={input}
            className="grid grid-cols-[4.5rem_auto_1fr] items-center gap-3 py-2.5 text-sm"
          >
            <span className="border border-input bg-background px-2 py-1 font-mono tabular-nums">
              {input}
            </span>
            <ArrowRight
              className="size-3.5 text-muted-foreground"
              aria-hidden
            />
            {result ? (
              <span className="font-semibold tabular-nums">{result}</span>
            ) : (
              <span className="text-xs text-destructive">
                Use 15-minute steps, from 15 min to 24 h.
              </span>
            )}
          </li>
        ))}
      </ul>
    </ScreenFrame>
  );
}

/** Bookings: one day's six figures and its project rows. */
export function BookingDay() {
  const figures: [string, string][] = [
    ["Logged", "6h 45m"],
    ["Billable", "5h 45m"],
    ["Overtime", "0h"],
    ["Booked current", "3h 45m"],
    ["Booked from external", "1h"],
    ["Booked total", "4h 45m"]
  ];
  return (
    <ScreenFrame route="/app/bookings" label="A day on PM4's Bookings page">
      <div className="-mx-4 -mt-4 flex items-center justify-between bg-muted px-4 py-2.5 sm:-mx-5 sm:-mt-5 sm:px-5">
        <p className="font-semibold">Tuesday, 3 November</p>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <ChevronDown className="size-3.5" aria-hidden />
          Expand all
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {figures.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-lg font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 border border-border text-xs">
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-border px-3 py-2 font-medium">
          <span>Project</span>
          <span className="w-12 text-right">Worked</span>
          <span className="w-12 text-right">Booked</span>
        </div>
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border px-3 py-2">
          <span className="flex min-w-0 items-center gap-2">
            <ChevronDown className="size-3.5 shrink-0" aria-hidden />
            <Dot color={SAMPLE_PROJECTS.orbit.color} />
            <span className="truncate">{SAMPLE_PROJECTS.orbit.name}</span>
          </span>
          <span className="w-12 text-right tabular-nums">2h 45m</span>
          <span className="w-12 text-right tabular-nums">2h 45m</span>
        </div>
        <div className="flex flex-col gap-1.5 border-b border-border bg-muted/50 py-2 pr-3 pl-10">
          <span className="flex items-center gap-2">
            <Check
              className="size-3.5 text-[var(--landing-booked)]"
              aria-hidden
            />
            Fix address validation · 2h
            <span className="ml-auto text-muted-foreground">
              Booked to Wed 4 Nov
            </span>
          </span>
          <span className="flex items-center gap-2">
            <Check
              className="size-3.5 text-[var(--landing-booked)]"
              aria-hidden
            />
            Review PR #412 with Anna · 45m
          </span>
        </div>
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-3 py-2">
          <span className="flex min-w-0 items-center gap-2">
            <ChevronRight className="size-3.5 shrink-0" aria-hidden />
            <Dot color={SAMPLE_PROJECTS.atlas.color} />
            <span className="truncate">{SAMPLE_PROJECTS.atlas.name}</span>
          </span>
          <span className="bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground">
            Book all
          </span>
          <span className="w-12 text-right tabular-nums">2h 30m</span>
          <span className="w-12 text-right tabular-nums">1h</span>
        </div>
      </div>
    </ScreenFrame>
  );
}

/** The booking prompt: the day's logs as text to paste into Slack. */
export function BookingPrompt() {
  return (
    <ScreenFrame route="Logs · Prompt" label="PM4's booking prompt">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium">Booking prompt</span>
        <span className="flex items-center gap-1 border border-border px-2 py-1">
          <Copy className="size-3" aria-hidden />
          Copy all
        </span>
      </div>
      <pre className="mt-3 overflow-x-auto bg-muted p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-foreground">
        {`Book my time accordingly:

**Project:** Orbit app
**Task:** Checkout
**Service:** Frontend development
**Date:** 3 Nov 2026
**Duration:** 2h 45m
**Notes:**
- Fix address validation on the checkout form
- Review PR #412 with Anna`}
      </pre>
    </ScreenFrame>
  );
}

/** Dashboard: start times above, hours worked (booked, not booked, non-prod) below, target as a dashed line. */
export function DashboardChart() {
  const width = 320;
  const plotLeft = 36;
  const plotRight = width - 4;
  const startTop = 8;
  const startBottom = 46;
  const barTop = 64;
  const barBottom = 150;
  const maxHours = 10;
  const hourPx = (barBottom - barTop) / maxHours;
  const slot = (plotRight - plotLeft) / SAMPLE_WORKDAYS.length;
  const barW = slot * 0.56;
  const startMin = 7 * 60 + 30;
  const startMax = 9 * 60 + 15;
  const yStart = (m: number) =>
    startBottom -
    ((m - startMin) / (startMax - startMin)) * (startBottom - startTop);
  const yHours = (min: number) => barBottom - (min / 60) * hourPx;
  const cx = (i: number) => plotLeft + slot * i + slot / 2;
  const startPath = SAMPLE_WORKDAYS.map(
    (d, i) => `${i === 0 ? "M" : "L"}${cx(i)},${yStart(d.start)}`
  ).join(" ");

  const worked = SAMPLE_WORKDAYS.reduce((s, d) => s + d.booked + d.unbooked, 0);
  const booked = SAMPLE_WORKDAYS.reduce((s, d) => s + d.booked, 0);
  const target = SAMPLE_WORKDAYS.length * SAMPLE_DAY.target;

  return (
    <ScreenFrame route="/app" label="PM4's dashboard">
      <div className="grid grid-cols-3 gap-4">
        <Figure label="Worked" value={formatDuration(worked)} />
        <Figure
          label="Target"
          value={formatDuration(target)}
          detail={`${SAMPLE_WORKDAYS.length} × 7h`}
        />
        <Figure label="Booked" value={formatDuration(booked)} />
      </div>

      <div className="mt-3 h-2 w-full bg-muted">
        <div
          className="relative h-full bg-[var(--landing-worked)]"
          style={{ width: `${(worked / target) * 100}%` }}
        >
          <div
            className="absolute inset-y-0 left-0 bg-[var(--landing-booked)]"
            style={{ width: `${(booked / worked) * 100}%` }}
          />
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} 168`}
        className="mt-5 w-full"
        role="img"
        aria-label="Workday chart: start times and hours worked per day, booked and not booked, against a 7 hour target"
      >
        {[9 * 60, 8 * 60].map((m) => (
          <g key={m}>
            <line
              x1={plotLeft}
              x2={plotRight}
              y1={yStart(m)}
              y2={yStart(m)}
              stroke="var(--border)"
            />
            <text
              x={plotLeft - 4}
              y={yStart(m) + 3}
              textAnchor="end"
              fontSize="8"
              fill="var(--muted-foreground)"
              className="font-mono"
            >
              {clock(m)}
            </text>
          </g>
        ))}
        <path
          d={startPath}
          fill="none"
          stroke="var(--landing-start)"
          strokeWidth="1.5"
        />
        {SAMPLE_WORKDAYS.map((d, i) => (
          <circle
            key={d.day}
            cx={cx(i)}
            cy={yStart(d.start)}
            r="2.2"
            fill="var(--landing-start)"
          />
        ))}

        {[0, 4, 8].map((h) => (
          <g key={h}>
            <line
              x1={plotLeft}
              x2={plotRight}
              y1={barBottom - h * hourPx}
              y2={barBottom - h * hourPx}
              stroke="var(--border)"
            />
            <text
              x={plotLeft - 4}
              y={barBottom - h * hourPx + 3}
              textAnchor="end"
              fontSize="8"
              fill="var(--muted-foreground)"
              className="font-mono"
            >
              {h}h
            </text>
          </g>
        ))}
        {SAMPLE_WORKDAYS.map((d, i) => {
          const x = cx(i) - barW / 2;
          const yBooked = yHours(d.booked);
          const yWorked = yHours(d.booked + d.unbooked);
          const yNonProd = yHours(d.booked + d.unbooked + d.nonProd);
          return (
            <g key={d.day}>
              <rect
                x={x}
                y={yBooked}
                width={barW}
                height={barBottom - yBooked}
                fill="var(--landing-booked)"
              />
              <rect
                x={x}
                y={yWorked}
                width={barW}
                height={yBooked - yWorked}
                fill="var(--landing-worked)"
              />
              <rect
                x={x}
                y={yNonProd}
                width={barW}
                height={yWorked - yNonProd}
                fill="var(--landing-nonprod)"
              />
              <text
                x={cx(i)}
                y={barBottom + 12}
                textAnchor="middle"
                fontSize="8"
                fill="var(--muted-foreground)"
                className="font-mono"
              >
                {d.day}
              </text>
            </g>
          );
        })}
        <line
          x1={plotLeft}
          x2={plotRight}
          y1={yHours(SAMPLE_DAY.target)}
          y2={yHours(SAMPLE_DAY.target)}
          stroke="var(--foreground)"
          strokeDasharray="3 3"
          strokeWidth="1"
        />
      </svg>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        {[
          ["var(--landing-start)", "Start time"],
          ["var(--landing-booked)", "Booked"],
          ["var(--landing-worked)", "Not booked"],
          ["var(--landing-nonprod)", "Non-prod"]
        ].map(([color, label]) => (
          <li key={label} className="flex items-center gap-1.5">
            <Dot color={color} className="size-2" />
            {label}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="w-3 border-t border-dashed border-foreground"
          />
          Daily target 7h
        </li>
      </ul>
    </ScreenFrame>
  );
}

const STATUS_PILL = {
  upcoming:
    "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
  progress: "bg-muted text-foreground",
  completed: "bg-teal-100 text-teal-800 dark:bg-teal-400/15 dark:text-teal-300"
} as const;

/** Projects with task counts per status, completion and logged time; tasks with due-date indicators. */
export function ProjectRows() {
  const projects = [
    { key: "orbit", counts: [6, 4, 10], logged: "212h 30m" },
    { key: "atlas", counts: [9, 3, 4], logged: "96h 15m" },
    { key: "internal", counts: [2, 1, 0], logged: "41h" }
  ] as const;
  const tasks = [
    { title: "Checkout", status: "In progress", due: "Overdue", tone: "late" },
    { title: "Launch", status: "Upcoming", due: "Due soon", tone: "soon" },
    { title: "Content model", status: "Completed", due: null, tone: null }
  ] as const;

  return (
    <ScreenFrame route="/app/projects" label="PM4's project list">
      <ul className="flex flex-col divide-y divide-border text-xs">
        {projects.map(({ key, counts, logged }) => {
          const total = counts[0] + counts[1] + counts[2];
          const done = Math.round((counts[2] / total) * 100);
          return (
            <li
              key={key}
              className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 py-2.5 sm:grid-cols-[1fr_auto_6rem_auto]"
            >
              <span className="flex min-w-0 items-center gap-2 font-medium">
                <Dot color={SAMPLE_PROJECTS[key].color} className="size-3" />
                <span className="truncate">{SAMPLE_PROJECTS[key].name}</span>
              </span>
              <span className="flex gap-1 tabular-nums">
                <span className={cn("px-1.5", STATUS_PILL.upcoming)}>
                  {counts[0]}
                </span>
                <span className={cn("px-1.5", STATUS_PILL.progress)}>
                  {counts[1]}
                </span>
                <span className={cn("px-1.5", STATUS_PILL.completed)}>
                  {counts[2]}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1 flex-1 bg-muted">
                  <span
                    className="block h-full bg-foreground"
                    style={{ width: `${done}%` }}
                  />
                </span>
                <span className="w-7 text-right text-muted-foreground tabular-nums">
                  {done}%
                </span>
              </span>
              <span className="text-right font-mono text-muted-foreground tabular-nums">
                {logged}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 mb-1 text-xs font-medium">Tasks</p>
      <ul className="flex flex-col gap-1.5 text-xs">
        {tasks.map((t) => (
          <li
            key={t.title}
            className="flex items-center gap-2 border border-border px-3 py-2"
          >
            <span
              aria-hidden
              className={cn(
                "size-2 shrink-0 rounded-full",
                t.tone === "late" && "bg-destructive",
                t.tone === "soon" && "bg-amber-500",
                t.tone === null && "bg-transparent"
              )}
            />
            <span className="min-w-0 flex-1 truncate">{t.title}</span>
            {t.due && (
              <span className="hidden text-muted-foreground sm:inline">
                {t.due}
              </span>
            )}
            <span className="flex items-center gap-1 border border-border px-1.5 py-0.5">
              {t.status}
              <ChevronDown className="size-3" aria-hidden />
            </span>
          </li>
        ))}
      </ul>
    </ScreenFrame>
  );
}

/** Notes (Markdown) and to-dos grouped by project and task. */
export function NotesTodos() {
  const groups = [
    {
      name: "General",
      color: "var(--muted-foreground)",
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
    <ScreenFrame route="/app/notes" label="PM4's notes and to-dos">
      <article
        className="border-l-4 pl-3"
        style={{ borderColor: SAMPLE_PROJECTS.orbit.color }}
      >
        <p className="text-sm font-semibold">Checkout edge cases</p>
        <p className="text-[11px] text-muted-foreground">
          {SAMPLE_PROJECTS.orbit.name} · Checkout · 3 Nov
        </p>
        <ul className="mt-2 list-disc pl-4 text-xs leading-relaxed">
          <li>
            Postcodes with a space:{" "}
            <code className="bg-muted px-1 font-mono">SW1A 1AA</code>
          </li>
          <li>
            <strong>Ask Jane</strong> about addresses without a street number
          </li>
        </ul>
      </article>

      <div className="mt-5 flex flex-col gap-3 text-xs">
        {groups.map((g) => (
          <div key={g.name}>
            <p className="mb-1.5 flex items-center gap-2 font-medium">
              <Dot color={g.color} className="size-2" />
              {g.name}
            </p>
            <ul className="flex flex-col gap-1.5 pl-4">
              {g.items.map((it) => (
                <li key={it.text} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-3.5 shrink-0 items-center justify-center border",
                      it.done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input"
                    )}
                  >
                    {it.done && <Check className="size-2.5" />}
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
    </ScreenFrame>
  );
}

/** The PMSPA connector: browse PMSPA records and import them; sync or push from a project page. */
export function PmspaSync() {
  const rows = [
    { kind: "Project", name: "Orbit app", state: "imported" },
    { kind: "Task", name: "Checkout", state: "imported" },
    { kind: "Task", name: "Payments refactor", state: "selected" },
    { kind: "Task", name: "Push notifications", state: "selected" },
    { kind: "Task", name: "App store listing", state: "none" }
  ] as const;
  return (
    <ScreenFrame route="/app/connectors/pmspa" label="PM4's PMSPA connector">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5 font-medium">
          <span
            aria-hidden
            className="size-2 rounded-full bg-[var(--landing-booked)]"
          />
          Connected
        </span>
        <span className="text-muted-foreground">Checked 2 minutes ago</span>
        <span className="ml-auto bg-primary px-2 py-1 font-medium text-primary-foreground">
          Import 2
        </span>
      </div>
      <ul className="mt-4 flex flex-col divide-y divide-border border border-border text-xs">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center gap-3 px-3 py-2">
            <span
              aria-hidden
              className={cn(
                "flex size-3.5 shrink-0 items-center justify-center border",
                r.state === "selected"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input",
                r.state === "imported" && "opacity-40"
              )}
            >
              {r.state === "selected" && <Check className="size-2.5" />}
            </span>
            <span className="w-12 shrink-0 font-mono text-[10px] text-muted-foreground uppercase">
              {r.kind}
            </span>
            <span className="min-w-0 flex-1 truncate">{r.name}</span>
            {r.state === "imported" && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <RefreshCw className="size-3" aria-hidden />
                In PM4
              </span>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs">
        <span className="text-muted-foreground">On a project or task:</span>
        <span className="flex items-center gap-1 border border-border px-2 py-1">
          <RefreshCw className="size-3" aria-hidden />
          Sync with PMSPA
        </span>
        <span className="border border-border px-2 py-1">Push to PMSPA</span>
      </div>
    </ScreenFrame>
  );
}
