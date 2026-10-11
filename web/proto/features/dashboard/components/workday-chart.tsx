"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis
} from "recharts";
import { CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDuration } from "@/lib/time";
import { formatClock } from "@/lib/time/clock";
import { routes } from "@/proto/lib/routes";
import { hourTicks, type Bucket } from "../stats";

const CONFIG: ChartConfig = {
  startMinute: { label: "Start", color: "var(--dash-start)" },
  booked: { label: "Booked", color: "var(--dash-booked)" },
  unbooked: { label: "Not booked", color: "var(--dash-worked)" }
};
const tick = { fontSize: 12, fill: "var(--muted-foreground)" };
const Y_WIDTH = 52;
const hours = (m: number) => (m === 0 ? "0h" : formatDuration(m));
const hourTick = (m: number) => `${m / 60}h`;
const clock = (m: number | null) => (m === null ? "—" : formatClock(m));

/** The start axis: whole hours around the earliest and latest start (08:00–10:00 when there is none). */
function startDomain(items: Bucket[]): [number, number] {
  const starts = items.flatMap((b) =>
    b.startMinute === null ? [] : [b.startMinute]
  );
  if (!starts.length) return [480, 600];
  const lo = Math.floor(Math.min(...starts) / 60) * 60;
  const hi = Math.ceil(Math.max(...starts) / 60) * 60;
  return [lo, Math.max(hi, lo + 60)];
}

type TipProps = { active?: boolean; payload?: readonly { payload?: Bucket }[] };
function WorkdayTooltip({
  active,
  payload,
  by
}: TipProps & { by: "day" | "week" }) {
  const b = active ? payload?.[0]?.payload : null;
  if (!b) return null;
  const row = (swatch: string | null, label: string, value: string) => (
    <div className="flex items-center gap-2">
      {swatch ? (
        <span
          className="size-2.5 shrink-0 rounded-[2px]"
          style={{ background: swatch }}
        />
      ) : (
        <span className="size-2.5 shrink-0" />
      )}
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto pl-4 font-mono font-medium tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
  return (
    <div className="grid gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium">{b.title}</div>
      {b.workdays === 0 && b.worked === 0 ? (
        <div className="text-muted-foreground">No work logged</div>
      ) : (
        <>
          {row(
            "var(--dash-start)",
            by === "week" ? "Avg. start" : "Start",
            b.startMinute === null ? "—" : formatClock(b.startMinute)
          )}
          {row(null, "Worked", hours(b.worked))}
          {row("var(--dash-booked)", "Booked", hours(b.booked))}
          {row("var(--dash-worked)", "Not booked", hours(b.unbooked))}
          {row(
            null,
            by === "week" ? `Target (${b.workdays} d)` : "Target",
            hours(b.workdays ? b.target : 0)
          )}
        </>
      )}
    </div>
  );
}

function Legend({
  by,
  avgStart,
  targetMinutes
}: {
  by: "day" | "week";
  avgStart: number | null;
  targetMinutes: number;
}) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span
          className="size-2 rounded-full"
          style={{ background: "var(--dash-start)" }}
        />
        {by === "day" ? "Start time" : "Avg. start time"}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-3 border-t border-dotted border-muted-foreground" />
        Average start {clock(avgStart)}
      </span>
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
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-3 border-t border-dashed border-foreground" />
        {by === "day"
          ? `Daily target ${formatDuration(targetMinutes)}`
          : "Weekly target"}
      </span>
    </div>
  );
}

/**
 * Start time (line) above hours worked (bars, booked + not booked) on one shared date axis. Two
 * synced panels instead of one chart with two y-axes: clock time and duration don't share a scale.
 */
export function WorkdayChart({
  items,
  by,
  targetMinutes,
  avgStart,
  today
}: {
  items: Bucket[];
  by: "day" | "week";
  targetMinutes: number;
  avgStart: number | null;
  today: string;
}) {
  const router = useRouter();
  const [view, setView] = useState<"chart" | "table">("chart");
  const [lo, hi] = startDomain(items);
  const startTicks = Array.from(
    { length: (hi - lo) / 60 + 1 },
    (_, i) => lo + i * 60
  );
  const yTicks = hourTicks(
    Math.max(...items.map((b) => b.worked), by === "day" ? targetMinutes : 0)
  );
  const ticks = new Map(items.map((b) => [b.key, b.tick]));
  const openDay = (b?: Bucket) => {
    if (by === "day" && b && b.date <= today)
      router.push(`${routes.app.time}?date=${b.date}`);
  };

  return (
    <Card className="h-full gap-0! border rounded-md! py-0!">
      <CardHeader className="flex h-11 flex-row items-center justify-between border-b px-4 py-0!">
        <CardTitle className="flex items-center gap-2 text-sm">
          <CalendarClock size={16} className="text-muted-foreground" /> Workdays
          <span className="font-normal text-muted-foreground">· by {by}</span>
        </CardTitle>
        <Tabs
          value={view}
          onValueChange={(v) => setView(v as "chart" | "table")}
        >
          <TabsList className="h-8">
            <TabsTrigger
              value="chart"
              className="cursor-pointer px-2.5 text-xs"
            >
              Chart
            </TabsTrigger>
            <TabsTrigger
              value="table"
              className="cursor-pointer px-2.5 text-xs"
            >
              Table
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="p-4">
        {view === "chart" ? (
          <div className="space-y-1">
            <Legend by={by} avgStart={avgStart} targetMinutes={targetMinutes} />
            <p className="text-xs font-medium text-muted-foreground">
              Start time
            </p>
            <ChartContainer
              config={CONFIG}
              className="aspect-auto! h-32! w-full"
            >
              <LineChart
                data={items}
                syncId="workdays"
                margin={{ top: 12, right: 8, bottom: 8, left: 0 }}
              >
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="key" hide />
                <YAxis
                  width={Y_WIDTH}
                  domain={[lo, hi]}
                  ticks={startTicks}
                  interval={0}
                  tickLine={false}
                  axisLine={false}
                  tick={tick}
                  tickFormatter={(m: number) => formatClock(m)}
                />
                {avgStart !== null ? (
                  <ReferenceLine
                    y={avgStart}
                    stroke="var(--muted-foreground)"
                    strokeDasharray="3 3"
                    strokeOpacity={0.6}
                  />
                ) : null}
                <ChartTooltip
                  cursor={{ stroke: "var(--border)" }}
                  content={() => null}
                />
                <Line
                  dataKey="startMinute"
                  type="monotone"
                  stroke="var(--dash-start)"
                  strokeWidth={2}
                  dot={{
                    r: 4,
                    fill: "var(--dash-start)",
                    stroke: "var(--card)",
                    strokeWidth: 2
                  }}
                  activeDot={{
                    r: 5,
                    fill: "var(--dash-start)",
                    stroke: "var(--card)",
                    strokeWidth: 2
                  }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ChartContainer>
            <p className="pt-2 text-xs font-medium text-muted-foreground">
              Hours worked
            </p>
            <ChartContainer
              config={CONFIG}
              className="aspect-auto! h-56! w-full"
            >
              <BarChart
                data={items}
                syncId="workdays"
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
                  width={Y_WIDTH}
                  domain={[0, yTicks.at(-1)!]}
                  ticks={yTicks}
                  interval={0}
                  tickLine={false}
                  axisLine={false}
                  tick={tick}
                  tickFormatter={hourTick}
                />
                <ChartTooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                  content={<WorkdayTooltip by={by} />}
                />
                {by === "day" ? (
                  <ReferenceLine
                    y={targetMinutes}
                    stroke="var(--foreground)"
                    strokeOpacity={0.6}
                    strokeDasharray="4 4"
                    ifOverflow="extendDomain"
                  />
                ) : null}
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
        ) : (
          <div className="overflow-y-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead className="px-3">
                    {by === "week" ? "Week" : "Date"}
                  </TableHead>
                  <TableHead className="px-3">
                    {by === "week" ? "Avg. start" : "Start"}
                  </TableHead>
                  <TableHead className="px-3">Worked</TableHead>
                  <TableHead className="px-3">Booked</TableHead>
                  <TableHead className="px-3">Target</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((b) => (
                  <TableRow
                    key={b.key}
                    className={
                      b.workdays === 0 && b.worked === 0
                        ? "text-muted-foreground"
                        : undefined
                    }
                  >
                    <TableCell className="px-3">{b.title}</TableCell>
                    <TableCell className="px-3 tabular-nums">
                      {b.startMinute === null
                        ? "—"
                        : formatClock(b.startMinute)}
                    </TableCell>
                    <TableCell className="px-3 tabular-nums">
                      {hours(b.worked)}
                    </TableCell>
                    <TableCell className="px-3 tabular-nums">
                      {hours(b.booked)}
                    </TableCell>
                    <TableCell className="px-3 tabular-nums">
                      {hours(b.workdays ? b.target : 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
