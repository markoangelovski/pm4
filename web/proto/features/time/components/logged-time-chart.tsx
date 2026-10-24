"use client";

import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig
} from "@/components/ui/chart";
import { formatDuration } from "@/lib/time";
import { eachDay } from "@/proto/features/dashboard/range";
import {
  buckets,
  hourTicks,
  type Bucket
} from "@/proto/features/dashboard/stats";
import { routes } from "@/proto/lib/routes";
import type { LoggedDayDto } from "../proposed-types";

const CONFIG: ChartConfig = {
  booked: { label: "Booked", color: "var(--dash-booked)" },
  unbooked: { label: "Not booked", color: "var(--dash-worked)" }
};
const tick = { fontSize: 12, fill: "var(--muted-foreground)" };
const hours = (m: number) => (m === 0 ? "0h" : formatDuration(m));

/** The dashboard's series colors: booked aqua, not booked blue. */
export const LOGGED_COLORS =
  "[--dash-worked:#2a78d6] [--dash-booked:#1baf7a] " +
  "dark:[--dash-worked:#3987e5] dark:[--dash-booked:#199e70]";

/** Every date from the first to the last logged one, as the dashboard buckets them (by day up to 62 days, else by week). */
export function loggedBuckets(days: LoggedDayDto[]) {
  if (!days.length) return { by: "day" as const, items: [] };
  const byDate = new Map(days.map((d) => [d.workDate, d]));
  const range = { from: days[0].workDate, to: days.at(-1)!.workDate };
  return buckets(
    eachDay(range).map((workDate) => ({
      workDate,
      startMinute: null,
      worked: byDate.get(workDate)?.workedMinutes ?? 0,
      booked: byDate.get(workDate)?.bookedMinutes ?? 0
    })),
    0
  );
}

type TipProps = { active?: boolean; payload?: readonly { payload?: Bucket }[] };
function LoggedTooltip({ active, payload }: TipProps) {
  const b = active ? payload?.[0]?.payload : null;
  if (!b) return null;
  const row = (swatch: string | null, label: string, value: number) => (
    <div className="flex items-center gap-2">
      <span
        className="size-2.5 shrink-0 rounded-[2px]"
        style={swatch ? { background: swatch } : undefined}
      />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto pl-4 font-mono font-medium tabular-nums text-foreground">
        {hours(value)}
      </span>
    </div>
  );
  return (
    <div className="grid gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium">{b.title}</div>
      {row(null, "Worked", b.worked)}
      {row("var(--dash-booked)", "Booked", b.booked)}
      {row("var(--dash-worked)", "Not booked", b.unbooked)}
    </div>
  );
}

/** SCR-044 Chart view: hours worked on the project or task (booked + not booked), over every date it was logged. */
export function LoggedTimeChart({ days }: { days: LoggedDayDto[] }) {
  const router = useRouter();
  const { by, items } = loggedBuckets(days);
  const yTicks = hourTicks(Math.max(0, ...items.map((b) => b.worked)));
  const ticks = new Map(items.map((b) => [b.key, b.tick]));
  const openDay = (b?: Bucket) => {
    if (by === "day" && b && b.worked > 0)
      router.push(`${routes.app.time}?date=${b.date}`);
  };

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            className="size-2 rounded-sm"
            style={{ background: "var(--dash-booked)" }}
          />
          Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="size-2 rounded-sm"
            style={{ background: "var(--dash-worked)" }}
          />
          Not booked
        </span>
        <span>· by {by}</span>
      </div>
      <ChartContainer config={CONFIG} className="aspect-auto! h-56! w-full">
        <BarChart
          data={items}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="key"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval="preserveStartEnd"
            minTickGap={8}
            tick={tick}
            tickFormatter={(key: string) => ticks.get(key) ?? ""}
          />
          <YAxis
            width={52}
            domain={[0, yTicks.at(-1)!]}
            ticks={yTicks}
            interval={0}
            tickLine={false}
            axisLine={false}
            tick={tick}
            tickFormatter={(m: number) => `${m / 60}h`}
          />
          <ChartTooltip
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            content={<LoggedTooltip />}
          />
          <Bar
            dataKey="booked"
            stackId="h"
            fill="var(--dash-booked)"
            stroke="var(--card)"
            strokeWidth={1}
            maxBarSize={24}
            isAnimationActive={false}
            className={by === "day" ? "cursor-pointer" : undefined}
            onClick={(d) => openDay(d.payload as Bucket)}
          />
          <Bar
            dataKey="unbooked"
            stackId="h"
            fill="var(--dash-worked)"
            stroke="var(--card)"
            strokeWidth={1}
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
            isAnimationActive={false}
            className={by === "day" ? "cursor-pointer" : undefined}
            onClick={(d) => openDay(d.payload as Bucket)}
          />
        </BarChart>
      </ChartContainer>
      {by === "day" ? (
        <p className="text-xs text-muted-foreground">
          Click a bar to open that day in Logs.
        </p>
      ) : null}
    </div>
  );
}

/** Total worked and booked as one bar (booked inside worked), with the not-booked rest; the dashboard's Worked · booked look. */
export function LoggedTotals({
  worked,
  booked
}: {
  worked: number;
  booked: number;
}) {
  const unbooked = worked - booked;
  const pct = worked > 0 ? Math.floor((booked / worked) * 100) : 0;
  const figure = (color: string, label: string, value: number) => (
    <div className="min-w-0 space-y-1">
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span
          className="size-2.5 rounded-[2px]"
          style={{ background: color }}
        />
        {label}
      </p>
      <p className="text-2xl font-semibold tracking-tight tabular-nums">
        {hours(value)}
      </p>
    </div>
  );
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {figure("var(--foreground)", "Total worked", worked)}
        {figure("var(--dash-booked)", "Booked", booked)}
        {figure("var(--dash-worked)", "Not booked", unbooked)}
      </div>
      <div
        className="h-6 overflow-hidden rounded-md bg-[var(--dash-worked)]"
        role="img"
        aria-label={`Worked ${hours(worked)}, booked ${hours(booked)}`}
      >
        <div
          className="h-full rounded-md bg-[var(--dash-booked)]"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {unbooked > 0
          ? `${pct}% booked · ${hours(unbooked)} still to book`
          : "Everything is booked"}
      </p>
    </div>
  );
}
