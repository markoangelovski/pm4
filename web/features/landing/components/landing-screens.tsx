import {
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Search
} from "lucide-react";
import { formatDuration } from "@/lib/time";
import { cn } from "@/lib/utils";
import {
  NON_PROD_COLOR,
  SAMPLE_DAY,
  SAMPLE_PROJECTS,
  SAMPLE_WORKDAYS,
  type SampleLog,
  type SampleProjectKey
} from "./landing-sample";

/**
 * Pictures of PM4's main screens for the landing page's product tour (FR-LAND-001): drawn with the app's own
 * tokens so they follow light and dark, with sample content from `landing-sample.ts`. Server components, no data.
 */

export function clock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function logColor(log: SampleLog): string {
  if (log.excluded || log.project === null) return NON_PROD_COLOR;
  return SAMPLE_PROJECTS[log.project].color;
}

/** A project's square avatar, as in the app's lists. */
export function ProjectAvatar({
  color,
  className
}: {
  color: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-4 shrink-0 rounded-[5px]", className)}
      style={{ background: color }}
    />
  );
}

export function Dot({
  color,
  className
}: {
  color: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 shrink-0 rounded-full", className)}
      style={{ background: color }}
    />
  );
}

/** A button as the app draws it; a picture, not a control. */
export function FauxButton({
  children,
  primary,
  className
}: {
  children: React.ReactNode;
  primary?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-[11px] font-medium whitespace-nowrap",
        primary
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-background",
        className
      )}
    >
      {children}
    </span>
  );
}

function ScreenTitle({
  title,
  sub,
  children
}: {
  title: string;
  sub?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-base font-semibold tracking-tight">{title}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

function Stat({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate text-[11px] text-muted-foreground">
        {label}
      </span>
      <span className="text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
        {value}
      </span>
      {detail && (
        <span className="truncate text-[11px] text-muted-foreground">
          {detail}
        </span>
      )}
    </div>
  );
}

/** Logs (`/app/time`): the day's figures, the timeline per project and the "Time by log" ring. */
export function LogsScreen() {
  const { start, now, target, logs } = SAMPLE_DAY;
  const axisEnd = now + 30;
  const span = axisEnd - start;
  const pct = (m: number) => `${((m - start) / span) * 100}%`;
  const logged = logs.reduce((sum, l) => sum + l.minutes, 0);
  const billable = logs
    .filter((l) => !l.excluded)
    .reduce((sum, l) => sum + l.minutes, 0);
  const unlogged = Math.min(now - start - logged, target - billable);

  const groupKeys: (SampleProjectKey | null)[] = [
    "internal",
    "orbit",
    "atlas",
    null
  ];
  const groups = groupKeys.map((key) => {
    const own = logs.filter((l) => l.project === key);
    return {
      name: key ? SAMPLE_PROJECTS[key].name : "Non-prod",
      color: key ? SAMPLE_PROJECTS[key].color : null,
      logs: own,
      total: own.reduce((sum, l) => sum + l.minutes, 0)
    };
  });

  const radius = 40;
  const ring = 2 * Math.PI * radius;
  const gap = 2;

  return (
    <div className="flex flex-col gap-5">
      <ScreenTitle title="Logs" sub={SAMPLE_DAY.label}>
        <FauxButton className="px-1.5">
          <ChevronLeft className="size-3.5" aria-hidden />
        </FauxButton>
        <FauxButton className="px-1.5">
          <CalendarDays className="size-3.5" aria-hidden />
        </FauxButton>
        <FauxButton primary>
          <Plus className="size-3.5" aria-hidden />
          Log time
        </FauxButton>
      </ScreenTitle>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Start" value={clock(start)} />
        <Stat label="Logged" value={formatDuration(logged)} />
        <Stat label="Start + logged" value={clock(start + logged)} />
        <Stat
          label="Billable"
          value={formatDuration(billable)}
          detail={`${Math.round((billable / target) * 100)}% of ${formatDuration(target)}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_11rem]">
        <div className="min-w-0">
          <div className="flex gap-4 border-b border-border text-xs">
            {["Timeline", "By Project", "By Task", "Sequential"].map(
              (view, i) => (
                <span
                  key={view}
                  className={cn(
                    "-mb-px border-b-2 pb-1.5 whitespace-nowrap",
                    i === 0
                      ? "border-foreground font-medium"
                      : "border-transparent text-muted-foreground",
                    i > 1 && "hidden sm:inline"
                  )}
                >
                  {view}
                </span>
              )
            )}
          </div>
          <ol className="flex flex-col divide-y divide-border">
            {groups.map((g) => (
              <li key={g.name} className="flex flex-col gap-2 py-2.5">
                <div className="flex items-center gap-2 text-xs">
                  {g.color && <ProjectAvatar color={g.color} />}
                  <span className="truncate font-medium">{g.name}</span>
                  <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                    {g.logs.length} {g.logs.length === 1 ? "log" : "logs"}
                  </span>
                  <span className="w-12 shrink-0 text-right font-medium tabular-nums">
                    {formatDuration(g.total)}
                  </span>
                </div>
                <div className="relative h-1.5 rounded-full bg-muted">
                  {g.logs.map((log, i) => (
                    <span
                      key={log.text}
                      className="absolute inset-y-0 rounded-full fill-mode-both motion-safe:animate-in motion-safe:duration-700 motion-safe:fade-in motion-safe:zoom-in-x-0"
                      style={{
                        left: pct(log.from),
                        width: `calc(${(log.minutes / span) * 100}% - 2px)`,
                        background: logColor(log),
                        opacity: i % 2 === 0 ? 1 : 0.6,
                        transformOrigin: "left"
                      }}
                    />
                  ))}
                </div>
              </li>
            ))}
          </ol>
          <div
            aria-hidden
            className="relative mt-1 h-4 text-[10px] text-muted-foreground tabular-nums"
          >
            {[8, 10, 12, 14, 16].map((h, i) => (
              <span
                key={h}
                className={cn("absolute", i > 0 && "-translate-x-1/2")}
                style={{ left: pct(h * 60) }}
              >
                {clock(h * 60)}
              </span>
            ))}
          </div>
        </div>

        <div className="hidden flex-col items-center gap-3 lg:flex">
          <p className="self-start text-xs font-medium">Time by log</p>
          <div className="relative w-36">
            <svg
              viewBox="0 0 100 100"
              className="w-full -rotate-90"
              role="img"
              aria-label="Ring chart of the day's logs"
            >
              {logs.map((log) => (
                <circle
                  key={log.text}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  strokeWidth="13"
                  stroke={logColor(log)}
                  strokeDasharray={`${(log.minutes / logged) * ring - gap} ${ring}`}
                  strokeDashoffset={-((log.from - start) / logged) * ring}
                />
              ))}
            </svg>
            <p className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-sm font-semibold tabular-nums">
                {formatDuration(logged)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {formatDuration(billable)} of {formatDuration(target)}
              </span>
            </p>
          </div>
          <ul className="flex w-full flex-col gap-1 text-[10px] text-muted-foreground">
            {logs.slice(0, 4).map((log) => (
              <li key={log.text} className="flex items-center gap-1.5">
                <Dot color={logColor(log)} className="size-1.5" />
                <span className="truncate">{log.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-muted/60 px-3 py-2 text-xs">
        <span className="flex items-center gap-1.5 font-medium">
          <Bell className="size-3.5" aria-hidden />
          {formatDuration(unlogged)} left to log today
        </span>
        <span className="text-muted-foreground">Now {clock(now)}</span>
      </p>
    </div>
  );
}

/** The dashboard's workday chart: start times above, hours per day below, the daily target dashed. */
export function WorkdayChart({ className }: { className?: string }) {
  const width = 340;
  const left = 30;
  const right = width - 4;
  const startTop = 8;
  const startBottom = 44;
  const barTop = 62;
  const barBottom = 150;
  const hourPx = (barBottom - barTop) / 10;
  const slot = (right - left) / SAMPLE_WORKDAYS.length;
  const barW = slot * 0.5;
  const startMin = 7 * 60 + 30;
  const startMax = 9 * 60 + 15;
  const yStart = (m: number) =>
    startBottom -
    ((m - startMin) / (startMax - startMin)) * (startBottom - startTop);
  const yHours = (min: number) => barBottom - (min / 60) * hourPx;
  const cx = (i: number) => left + slot * i + slot / 2;
  const startPath = SAMPLE_WORKDAYS.map(
    (d, i) => `${i === 0 ? "M" : "L"}${cx(i)},${yStart(d.start)}`
  ).join(" ");
  const label = {
    fontSize: 8,
    fill: "var(--muted-foreground)"
  };

  return (
    <svg
      viewBox={`0 0 ${width} 166`}
      className={cn("w-full", className)}
      role="img"
      aria-label="Workday chart: start times and hours worked per day, booked and not booked, against a 7 hour target"
    >
      {[9 * 60, 8 * 60].map((m) => (
        <g key={m}>
          <line
            x1={left}
            x2={right}
            y1={yStart(m)}
            y2={yStart(m)}
            stroke="var(--border)"
          />
          <text x={left - 4} y={yStart(m) + 3} textAnchor="end" {...label}>
            {clock(m)}
          </text>
        </g>
      ))}
      <path
        d={startPath}
        fill="none"
        stroke="var(--lp-start)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {SAMPLE_WORKDAYS.map((d, i) => (
        <circle
          key={d.day}
          cx={cx(i)}
          cy={yStart(d.start)}
          r="2.2"
          fill="var(--lp-start)"
        />
      ))}
      {[0, 4, 8].map((h) => (
        <g key={h}>
          <line
            x1={left}
            x2={right}
            y1={barBottom - h * hourPx}
            y2={barBottom - h * hourPx}
            stroke="var(--border)"
          />
          <text
            x={left - 4}
            y={barBottom - h * hourPx + 3}
            textAnchor="end"
            {...label}
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
              fill="var(--lp-booked)"
            />
            <rect
              x={x}
              y={yWorked}
              width={barW}
              height={yBooked - yWorked}
              fill="var(--lp-worked)"
            />
            <rect
              x={x}
              y={yNonProd}
              width={barW}
              height={yWorked - yNonProd}
              fill="var(--lp-nonprod)"
            />
            <text x={cx(i)} y={barBottom + 12} textAnchor="middle" {...label}>
              {d.day}
            </text>
          </g>
        );
      })}
      <line
        x1={left}
        x2={right}
        y1={yHours(SAMPLE_DAY.target)}
        y2={yHours(SAMPLE_DAY.target)}
        stroke="var(--foreground)"
        strokeDasharray="3 3"
        strokeWidth="1"
      />
    </svg>
  );
}

export function ChartLegend() {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      {[
        ["var(--lp-start)", "Start time"],
        ["var(--lp-booked)", "Booked"],
        ["var(--lp-worked)", "Not booked"],
        ["var(--lp-nonprod)", "Non-prod"]
      ].map(([color, label]) => (
        <li key={label} className="flex items-center gap-1.5">
          <Dot color={color} />
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
  );
}

function Meter({
  label,
  value,
  pct,
  color,
  note
}: {
  label: string;
  value: string;
  pct: number;
  color: string;
  note: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-[11px] text-muted-foreground">{note}</span>
    </div>
  );
}

export function workdayTotals() {
  const worked = SAMPLE_WORKDAYS.reduce((s, d) => s + d.booked + d.unbooked, 0);
  const booked = SAMPLE_WORKDAYS.reduce((s, d) => s + d.booked, 0);
  const target = SAMPLE_WORKDAYS.length * SAMPLE_DAY.target;
  const avgStart = Math.round(
    SAMPLE_WORKDAYS.reduce((s, d) => s + d.start, 0) / SAMPLE_WORKDAYS.length
  );
  return { worked, booked, target, avgStart };
}

/** Dashboard (`/app`): the range's tiles, the workday chart and worked against target and booked. */
export function DashboardScreen() {
  const { worked, booked, target, avgStart } = workdayTotals();
  return (
    <div className="flex flex-col gap-5">
      <ScreenTitle title="Dashboard" sub="1 Nov 2026 – 13 Nov 2026">
        <FauxButton>
          So far
          <ChevronDown className="size-3" aria-hidden />
        </FauxButton>
      </ScreenTitle>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Projects" value="3" detail="3 with time logged" />
        <Stat label="Tasks" value="39" detail="17 upcoming · 8 in progress" />
        <Stat
          label="Workdays"
          value={String(SAMPLE_WORKDAYS.length)}
          detail="Days with a start time"
        />
        <Stat
          label="Average start"
          value={clock(avgStart)}
          detail="Earliest 07:45 · latest 09:00"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_13rem]">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-xs font-medium">
            Workdays{" "}
            <span className="font-normal text-muted-foreground">· by day</span>
          </p>
          <WorkdayChart />
          <ChartLegend />
        </div>
        <div className="flex flex-col gap-4">
          <p className="text-xs font-medium">Worked · Target · Booked</p>
          <div className="grid grid-cols-3 gap-2 lg:grid-cols-1 lg:gap-1">
            {[
              ["Worked", formatDuration(worked)],
              ["Target", formatDuration(target)],
              ["Booked", formatDuration(booked)]
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex flex-col lg:flex-row lg:items-baseline lg:justify-between"
              >
                <span className="text-[11px] text-muted-foreground">
                  {label}
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {value}
                </span>
              </div>
            ))}
          </div>
          <p className="rounded-lg border border-border px-3 py-2 text-xs font-medium">
            {formatDuration(target - worked)} under target
          </p>
          <Meter
            label="Worked of target"
            value={`${Math.round((worked / target) * 100)}%`}
            pct={(worked / target) * 100}
            color="var(--lp-worked)"
            note={`${formatDuration(worked)} of ${formatDuration(target)}`}
          />
          <Meter
            label="Booked of worked"
            value={`${Math.round((booked / worked) * 100)}%`}
            pct={(booked / worked) * 100}
            color="var(--lp-booked)"
            note={`${formatDuration(worked - booked)} still to book`}
          />
        </div>
      </div>
    </div>
  );
}

/** Bookings (`/app/bookings`): one day's six figures and its project rows. */
export function BookingsScreen() {
  const figures: [string, string][] = [
    ["Logged", "6h 45m"],
    ["Billable", "5h 45m"],
    ["Overtime", "0h"],
    ["Booked current", "3h 45m"],
    ["Booked from external", "1h"],
    ["Booked total", "4h 45m"]
  ];
  const cols = "grid grid-cols-[minmax(0,1fr)_4rem_3.5rem_3.5rem] gap-3";
  return (
    <div className="flex flex-col gap-5">
      <ScreenTitle title="Bookings" sub="November 2026">
        <FauxButton>
          This month
          <ChevronDown className="size-3" aria-hidden />
        </FauxButton>
        <FauxButton className="hidden sm:inline-flex">
          All projects
          <ChevronDown className="size-3" aria-hidden />
        </FauxButton>
      </ScreenTitle>

      <div className="overflow-hidden rounded-lg border border-border">
        <p className="bg-muted px-3 py-2 text-sm font-semibold">
          {SAMPLE_DAY.label}
        </p>
        <dl className="grid grid-cols-3 gap-x-4 gap-y-3 p-3 sm:grid-cols-6">
          {figures.map(([label, value]) => (
            <div key={label} className="flex min-w-0 flex-col gap-0.5">
              <dt className="truncate text-[11px] text-muted-foreground">
                {label}
              </dt>
              <dd className="text-base font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="border-t border-border text-xs">
          <div
            className={cn(
              cols,
              "border-b border-border px-3 py-2 font-medium text-muted-foreground"
            )}
          >
            <span>Project</span>
            <span />
            <span className="text-right">Worked</span>
            <span className="text-right">Booked</span>
          </div>
          <div
            className={cn(
              cols,
              "items-center border-b border-border px-3 py-2"
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <ChevronDown className="size-3.5 shrink-0" aria-hidden />
              <ProjectAvatar color={SAMPLE_PROJECTS.orbit.color} />
              <span className="truncate font-medium">
                {SAMPLE_PROJECTS.orbit.name}
              </span>
            </span>
            <span />
            <span className="text-right tabular-nums">2h 45m</span>
            <span className="text-right tabular-nums">2h 45m</span>
          </div>
          <ul className="flex flex-col gap-1.5 border-b border-border bg-muted/40 py-2 pr-3 pl-9">
            <li className="flex flex-wrap items-center gap-x-2">
              <Check className="size-3.5 text-[var(--lp-booked)]" aria-hidden />
              Fix address validation · 2h
              <span className="ml-auto text-muted-foreground">
                Booked to Wed 4 Nov
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-3.5 text-[var(--lp-booked)]" aria-hidden />
              Review PR #412 with Anna · 45m
            </li>
          </ul>
          <div
            className={cn(
              cols,
              "items-center border-b border-border px-3 py-2"
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <ChevronRight className="size-3.5 shrink-0" aria-hidden />
              <ProjectAvatar color={SAMPLE_PROJECTS.atlas.color} />
              <span className="truncate font-medium">
                {SAMPLE_PROJECTS.atlas.name}
              </span>
            </span>
            <FauxButton primary className="h-6">
              Book all
            </FauxButton>
            <span className="text-right tabular-nums">2h 30m</span>
            <span className="text-right tabular-nums">1h</span>
          </div>
          <div className={cn(cols, "items-center px-3 py-2")}>
            <span className="flex min-w-0 items-center gap-2">
              <ChevronRight className="size-3.5 shrink-0" aria-hidden />
              <ProjectAvatar color={SAMPLE_PROJECTS.internal.color} />
              <span className="truncate font-medium">
                {SAMPLE_PROJECTS.internal.name}
              </span>
            </span>
            <span />
            <span className="text-right tabular-nums">30m</span>
            <span className="text-right tabular-nums">0h</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border border-border bg-muted px-3 py-2">
        <p className="text-sm font-semibold">Wednesday, 4 November 2026</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          Logged 7h · Booked current 4h 30m · Booked from external 2h
        </p>
      </div>
    </div>
  );
}

const STATUS_PILL = {
  upcoming:
    "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
  progress: "bg-muted text-foreground",
  completed: "bg-teal-100 text-teal-800 dark:bg-teal-400/15 dark:text-teal-300"
} as const;

/** Projects (`/app/projects`): search and sort, task counts per status, completion and logged time. */
export function ProjectsScreen() {
  const projects = [
    {
      key: "atlas",
      lead: "Anna Reed",
      counts: [9, 3, 4],
      logged: "96h 15m",
      synced: false
    },
    {
      key: "internal",
      lead: "John Hale",
      counts: [2, 1, 0],
      logged: "41h",
      synced: false
    },
    {
      key: "orbit",
      lead: "Jane Moss",
      counts: [6, 4, 10],
      logged: "212h 30m",
      synced: true
    }
  ] as const;
  const more = [
    {
      name: "Brand refresh",
      color: "#ec4899",
      lead: "Tom Park",
      counts: [0, 0, 7],
      logged: "58h 45m"
    },
    {
      name: "Northwind API",
      color: "#2a78d6",
      lead: "Anna Reed",
      counts: [5, 2, 1],
      logged: "17h 30m"
    }
  ];
  const rows = [
    ...projects.slice(0, 1).map((p) => ({
      ...p,
      ...SAMPLE_PROJECTS[p.key]
    })),
    { ...more[0], synced: false },
    ...projects.slice(1, 2).map((p) => ({
      ...p,
      ...SAMPLE_PROJECTS[p.key]
    })),
    { ...more[1], synced: true },
    ...projects.slice(2).map((p) => ({ ...p, ...SAMPLE_PROJECTS[p.key] }))
  ];
  const cols =
    "grid grid-cols-[minmax(0,1fr)_5.5rem_3.75rem] sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_5.5rem_6.5rem_3.75rem] items-center gap-3";
  return (
    <div className="flex flex-col gap-5">
      <ScreenTitle title="Projects">
        <FauxButton primary>
          <Plus className="size-3.5" aria-hidden />
          New project
        </FauxButton>
      </ScreenTitle>

      <div className="flex items-center justify-between gap-2">
        <span className="flex h-7 min-w-0 flex-1 items-center gap-2 rounded-md border border-border px-2 text-[11px] text-muted-foreground sm:max-w-56">
          <Search className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">Search by title or lead…</span>
        </span>
        <FauxButton>
          Title A–Z
          <ChevronDown className="size-3" aria-hidden />
        </FauxButton>
      </div>

      <div className="text-xs">
        <div
          className={cn(
            cols,
            "border-b border-border pb-2 font-medium text-muted-foreground"
          )}
        >
          <span>Title</span>
          <span className="hidden sm:inline">Project lead</span>
          <span>Tasks</span>
          <span className="hidden sm:inline">Completed</span>
          <span className="text-right">Logged</span>
        </div>
        <ul className="flex flex-col divide-y divide-border">
          {rows.map(({ name, color, lead, counts, logged, synced }) => {
            const total = counts[0] + counts[1] + counts[2];
            const done = Math.round((counts[2] / total) * 100);
            return (
              <li key={name} className={cn(cols, "py-3")}>
                <span className="flex min-w-0 items-center gap-2 font-medium">
                  <ProjectAvatar color={color} className="size-5" />
                  <span className="truncate">{name}</span>
                  {synced && (
                    <RefreshCw
                      className="size-3 shrink-0 text-muted-foreground"
                      aria-label="Linked to PMSPA"
                    />
                  )}
                </span>
                <span className="hidden min-w-0 items-center gap-2 sm:flex">
                  <span
                    aria-hidden
                    className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-medium"
                  >
                    {lead
                      .split(" ")
                      .map((w) => w[0])
                      .join("")}
                  </span>
                  <span className="truncate">{lead}</span>
                </span>
                <span className="flex gap-1 tabular-nums">
                  {(["upcoming", "progress", "completed"] as const).map(
                    (s, i) => (
                      <span
                        key={s}
                        className={cn(
                          "min-w-5 rounded-full px-1.5 text-center",
                          STATUS_PILL[s]
                        )}
                      >
                        {counts[i]}
                      </span>
                    )
                  )}
                </span>
                <span className="hidden items-center gap-2 sm:flex">
                  <span className="h-1 flex-1 rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-foreground"
                      style={{ width: `${done}%` }}
                    />
                  </span>
                  <span className="w-7 text-right text-muted-foreground tabular-nums">
                    {done}%
                  </span>
                </span>
                <span className="text-right tabular-nums">{logged}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        Open a project for its tasks, notes, to-dos and every log booked or
        still to book.
      </p>
    </div>
  );
}
