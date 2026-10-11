"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
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
  target: { label: "Target", color: "var(--muted-foreground)" },
  booked: { label: "Booked", color: "var(--dash-booked)" }
};
const tick = { fontSize: 12, fill: "var(--muted-foreground)" };

function Tip({
  active,
  payload
}: {
  active?: boolean;
  payload?: readonly { payload?: RunningPoint }[];
}) {
  const p = active ? payload?.[0]?.payload : null;
  if (!p || p.worked === null) return null;
  return (
    <div className="space-y-1 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium">Up to {p.tick}</div>
      <div className="flex justify-between gap-4">
        <span>Worked</span>
        <span className="tabular-nums">{formatDuration(p.worked)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span>Target</span>
        <span className="tabular-nums">{formatDuration(p.target ?? 0)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span>Booked</span>
        <span className="tabular-nums">{formatDuration(p.booked ?? 0)}</span>
      </div>
    </div>
  );
}

/** SCR-010 / FR-RPT-005: cumulative worked, target and booked, up to today. */
export function RunningTotals({
  points
}: {
  points: RunningPoint[];
}): React.JSX.Element {
  const last = [...points].reverse().find((p) => p.worked !== null);
  const max = Math.max(
    0,
    ...points.flatMap((p) => [p.worked ?? 0, p.booked ?? 0, p.target ?? 0])
  );
  const ticks = hourTicks(max);
  return (
    <Card className="h-full gap-0! border rounded-md! py-0!">
      <CardHeader className="flex h-11 flex-row items-center justify-between border-b px-4 py-0! pb-0!">
        <CardTitle className="text-sm">Running totals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ background: "var(--dash-worked)" }}
            />
            Worked
            <span className="font-medium text-foreground tabular-nums">
              {formatDuration(last?.worked ?? 0)}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 border-t border-dashed border-muted-foreground" />
            Target
            <span className="font-medium text-foreground tabular-nums">
              {formatDuration(last?.target ?? 0)}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ background: "var(--dash-booked)" }}
            />
            Booked
            <span className="font-medium text-foreground tabular-nums">
              {formatDuration(last?.booked ?? 0)}
            </span>
          </span>
        </div>
        <ChartContainer config={CONFIG} className="h-60! w-full">
          <LineChart
            data={points}
            margin={{ top: 8, right: 8, bottom: 0, left: -10 }}
          >
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
              minTickGap={24}
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
            <ChartTooltip content={<Tip />} />
            <Line
              dataKey="worked"
              stroke="var(--dash-worked)"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="target"
              stroke="var(--muted-foreground)"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="booked"
              stroke="var(--dash-booked)"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
