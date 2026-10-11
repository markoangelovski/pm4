"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { LineChart as LineIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig
} from "@/components/ui/chart";
import { formatDuration } from "@/lib/time";
import { hourTicks, type RunningPoint } from "../stats";

const CONFIG: ChartConfig = {
  worked: { label: "Worked", color: "var(--dash-worked)" },
  booked: { label: "Booked", color: "var(--dash-booked)" },
  target: { label: "Target", color: "var(--foreground)" }
};
const SERIES = [
  {
    key: "worked",
    label: "Worked",
    color: "var(--dash-worked)",
    dash: undefined
  },
  { key: "target", label: "Target", color: "var(--foreground)", dash: "5 4" },
  {
    key: "booked",
    label: "Booked",
    color: "var(--dash-booked)",
    dash: undefined
  }
] as const;
const tick = { fontSize: 12, fill: "var(--muted-foreground)" };
const hours = (m: number) => (m === 0 ? "0h" : formatDuration(m));

/** As in production's legend: a dot for worked and booked, a dashed line for the target. */
function Marker({ s }: { s: (typeof SERIES)[number] }) {
  return s.dash ? (
    <span
      className="inline-block w-3 border-t border-dashed"
      style={{ borderColor: s.color }}
    />
  ) : (
    <span className="size-2 rounded-full" style={{ background: s.color }} />
  );
}

type TipProps = {
  active?: boolean;
  payload?: readonly { payload?: RunningPoint }[];
};
function RunningTooltip({ active, payload }: TipProps) {
  const p = active ? payload?.[0]?.payload : null;
  if (!p || p.worked === null) return null;
  return (
    <div className="grid gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium">Up to {p.tick}</div>
      {SERIES.map((s) => (
        <div key={s.key} className="flex items-center gap-2">
          <Marker s={s} />
          <span className="text-muted-foreground">{s.label}</span>
          <span className="ml-auto pl-4 font-mono font-medium tabular-nums">
            {hours(p[s.key] ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Cumulative worked, booked and target through the range: are you on pace, and is booking keeping up? */
export function RunningTotals({ points }: { points: RunningPoint[] }) {
  const last = [...points].reverse().find((p) => p.worked !== null);
  const yTicks = hourTicks(
    Math.max(
      0,
      ...points.flatMap((p) => [p.worked ?? 0, p.target ?? 0, p.booked ?? 0])
    )
  );
  const ticks = new Map(points.map((p) => [p.workDate, p.tick]));
  return (
    <Card className="h-full gap-0! border rounded-md! py-0!">
      <CardHeader className="flex h-11 flex-row items-center border-b px-4 py-0!">
        <CardTitle className="flex items-center gap-2 text-sm">
          <LineIcon size={16} className="text-muted-foreground" /> Running
          totals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
          {SERIES.map((s) => (
            <span
              key={s.key}
              className="flex items-center gap-1.5 text-muted-foreground"
            >
              <Marker s={s} />
              {s.label}
              <span className="font-medium text-foreground tabular-nums">
                {hours(last?.[s.key] ?? 0)}
              </span>
            </span>
          ))}
        </div>
        <ChartContainer config={CONFIG} className="aspect-auto! w-full">
          <LineChart
            data={points}
            margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="workDate"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval="preserveStartEnd"
              minTickGap={8}
              tick={tick}
              tickFormatter={(date: string) => ticks.get(date) ?? ""}
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
              cursor={{ stroke: "var(--border)" }}
              content={<RunningTooltip />}
            />
            {SERIES.map((s) => (
              <Line
                key={s.key}
                dataKey={s.key}
                type="linear"
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.dash}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: s.color,
                  stroke: "var(--card)",
                  strokeWidth: 2
                }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
