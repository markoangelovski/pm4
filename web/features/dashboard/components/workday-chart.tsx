"use client";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { routes } from "@/lib/routes";
import { formatDuration } from "@/lib/time";
import { formatClock } from "@/lib/time/clock";
import { hourTicks, type Bucket } from "../stats";

const CONFIG: ChartConfig = {
  startMinute: { label: "Start time", color: "var(--dash-start)" },
  booked: { label: "Booked", color: "var(--dash-booked)" },
  unbooked: { label: "Not booked", color: "var(--dash-worked)" }
};
const tick = { fontSize: 12, fill: "var(--muted-foreground)" };
const MARGIN = { top: 8, right: 8, bottom: 0, left: -10 };

const hours = (m: number) => (m === 0 ? "0h" : formatDuration(m));
const clock = (m: number | null) => (m === null ? "—" : formatClock(m));

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function Tip({
  active,
  payload,
  by
}: {
  active?: boolean;
  payload?: readonly { payload?: Bucket }[];
  by: "day" | "week";
}) {
  const b = active ? payload?.[0]?.payload : null;
  if (!b) return null;
  const empty = b.worked === 0 && b.startMinute === null;
  return (
    <div className="space-y-1 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium">{b.title}</div>
      {empty ? (
        <div className="text-muted-foreground">No work logged</div>
      ) : (
        <>
          <Row
            label={by === "day" ? "Start" : "Avg. start"}
            value={clock(b.startMinute)}
          />
          <Row label="Worked" value={hours(b.worked)} />
          <Row label="Booked" value={hours(b.booked)} />
          <Row label="Not booked" value={hours(b.unbooked)} />
          <Row
            label={by === "day" ? "Target" : `Target (${b.workdays} d)`}
            value={hours(b.target)}
          />
        </>
      )}
      {by === "day" ? (
        <div className="text-muted-foreground">
          Click a bar to open that day in Logs.
        </div>
      ) : null}
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

function startDomain(items: Bucket[]): { domain: [number, number]; ticks: number[] } {
  const starts = items.flatMap((i) =>
    i.startMinute === null ? [] : [i.startMinute]
  );
  let lo = 480;
  let hi = 600;
  if (starts.length) {
    lo = Math.floor(Math.min(...starts) / 60) * 60;
    hi = Math.ceil(Math.max(...starts) / 60) * 60;
    if (hi - lo < 60) hi = lo + 60;
  }
  const step = 60 * Math.ceil((hi - lo) / 60 / 5);
  const ticks: number[] = [];
  for (let t = lo; t < hi; t += step) ticks.push(t);
  ticks.push(hi);
  return { domain: [lo, hi], ticks };
}

function ChartPanels({
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
  const start = startDomain(items);
  const maxWorked = Math.max(
    0,
    ...items.map((i) => i.worked),
    by === "day" ? targetMinutes : 0
  );
  const ticks = hourTicks(maxWorked);
  const open = (e: unknown) => {
    const b = ((e as { payload?: Bucket }).payload ?? e) as Bucket;
    if (by === "day" && b.date <= today) {
      router.push(`${routes.app.time}?date=${b.date}`);
    }
  };
  return (
    <div className="space-y-2">
      <Legend by={by} avgStart={avgStart} targetMinutes={targetMinutes} />
      <div className="text-xs font-medium text-muted-foreground">
        Start time
      </div>
      <ChartContainer config={CONFIG} className="h-32! w-full">
        <LineChart data={items} syncId="workdays" margin={MARGIN}>
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="4 4"
          />
          <XAxis dataKey="tick" hide />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tick={tick}
            domain={start.domain}
            ticks={start.ticks}
            tickFormatter={(m: number) => formatClock(m)}
          />
          <ChartTooltip content={<Tip by={by} />} />
          {avgStart !== null ? (
            <ReferenceLine
              y={avgStart}
              stroke="var(--dash-start)"
              strokeDasharray="2 3"
            />
          ) : null}
          <Line
            dataKey="startMinute"
            stroke="var(--dash-start)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--dash-start)" }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>
      <div className="text-xs font-medium text-muted-foreground">
        Hours worked
      </div>
      <ChartContainer config={CONFIG} className="h-48! w-full">
        <BarChart data={items} syncId="workdays" margin={MARGIN}>
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="4 4"
          />
          <XAxis
            dataKey="tick"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={12}
            tick={tick}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tick={tick}
            ticks={ticks}
            domain={[0, ticks[ticks.length - 1]]}
            tickFormatter={(m: number) => `${+(m / 60).toFixed(1)}h`}
          />
          <ChartTooltip
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            content={<Tip by={by} />}
          />
          <Bar
            dataKey="booked"
            stackId="hours"
            fill="var(--dash-booked)"
            maxBarSize={32}
            isAnimationActive={false}
            onClick={open}
          />
          <Bar
            dataKey="unbooked"
            stackId="hours"
            fill="var(--dash-worked)"
            radius={[3, 3, 0, 0]}
            maxBarSize={32}
            isAnimationActive={false}
            onClick={open}
          />
          {by === "day" ? (
            <ReferenceLine
              y={targetMinutes}
              stroke="var(--foreground)"
              strokeDasharray="5 4"
            />
          ) : null}
        </BarChart>
      </ChartContainer>
    </div>
  );
}

function DataTable({ items, by }: { items: Bucket[]; by: "day" | "week" }) {
  return (
    <div className="max-h-96 overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-card">
          <TableRow>
            <TableHead>{by === "day" ? "Date" : "Week"}</TableHead>
            <TableHead>{by === "day" ? "Start" : "Avg. start"}</TableHead>
            <TableHead>Worked</TableHead>
            <TableHead>Booked</TableHead>
            <TableHead>Target</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((b) => (
            <TableRow
              key={b.key}
              className={b.worked === 0 ? "text-muted-foreground" : undefined}
            >
              <TableCell>{b.title}</TableCell>
              <TableCell className="tabular-nums">{clock(b.startMinute)}</TableCell>
              <TableCell className="tabular-nums">{hours(b.worked)}</TableCell>
              <TableCell className="tabular-nums">{hours(b.booked)}</TableCell>
              <TableCell className="tabular-nums">{hours(b.target)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** SCR-010 / FR-RPT-003: the start line and hours bars per day or week, with a table tab. */
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
}): React.JSX.Element {
  return (
    <Card className="h-full gap-0! border rounded-md! py-0!">
      <Tabs defaultValue="chart" className="gap-0">
        <CardHeader className="flex h-11 flex-row items-center justify-between border-b px-4 py-0! pb-0!">
          <CardTitle className="text-sm">Workdays · by {by}</CardTitle>
          <TabsList>
            <TabsTrigger value="chart" className="cursor-pointer">
              Chart
            </TabsTrigger>
            <TabsTrigger value="table" className="cursor-pointer">
              Table
            </TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent className="p-5">
          <TabsContent value="chart">
            <ChartPanels
              items={items}
              by={by}
              targetMinutes={targetMinutes}
              avgStart={avgStart}
              today={today}
            />
          </TabsContent>
          <TabsContent value="table">
            <DataTable items={items} by={by} />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
