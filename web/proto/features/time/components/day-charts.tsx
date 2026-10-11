"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis
} from "recharts";
import { useState } from "react";
import { BarChart3, Maximize2, PieChart as PieIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig
} from "@/components/ui/chart";
import { formatDuration } from "@/lib/time";
import { barBars, pieSlices } from "../day";
import type { TimeLog } from "../types";

const HUES = [250, 160, 25, 320, 85, 205, 355, 120];
const LIGHTNESS = [0.68, 0.55, 0.8];
export const sliceColor = (i: number) =>
  `oklch(${LIGHTNESS[Math.floor(i / HUES.length) % LIGHTNESS.length]} 0.15 ${HUES[i % HUES.length]})`;
/** The colour of each log: its slice in the pie. The dot beside a log uses the same one. */
export function logColors(logs: TimeLog[]): Record<string, string> {
  return Object.fromEntries(logs.map((l, i) => [l.id, sliceColor(i)]));
}
const CONFIG: ChartConfig = { minutes: { label: "Time" } };
/** Same height as the view tabs on the left, so the two bottom borders line up. */
const HEADER =
  "flex h-11 flex-row items-center justify-between border-b px-4 py-0! pb-0!";
const tick = { fontSize: 12, fill: "var(--muted-foreground)" };

type TipItem = {
  color?: string;
  payload?: { label: string; minutes: number; fill?: string };
};
function MinutesTooltip({
  active,
  payload
}: {
  active?: boolean;
  payload?: readonly TipItem[];
}) {
  const p = active ? payload?.[0]?.payload : null;
  if (!p) return null;
  return (
    <div className="flex max-w-64 items-center gap-2 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <span
        className="size-2.5 shrink-0 rounded-[2px]"
        style={{ background: p.fill ?? payload?.[0]?.color }}
      />
      <span className="truncate font-medium">{p.label}</span>
      <span className="ml-auto pl-2 font-mono font-medium tabular-nums">
        {formatDuration(p.minutes)}
      </span>
    </div>
  );
}

type Slice = ReturnType<typeof pieSlices>[number] & { fill: string };
type BarItem = ReturnType<typeof barBars>[number] & { fill: string };

function ExpandButton({
  onClick,
  label
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-mr-2 cursor-pointer"
      aria-label={`Expand ${label}`}
      onClick={onClick}
    >
      <Maximize2 data-icon="inline-start" /> Expand
    </Button>
  );
}

function PieBody({
  slices,
  logged,
  targetMinutes,
  large
}: {
  slices: Slice[];
  logged: number;
  targetMinutes: number;
  large?: boolean;
}) {
  return (
    <div
      className={
        large
          ? "flex w-full flex-col items-center justify-center gap-8 lg:flex-row"
          : "space-y-4"
      }
    >
      <div
        className={
          large
            ? "relative size-[min(65vh,36rem)] shrink-0"
            : "relative mx-auto size-56 max-w-full"
        }
      >
        <ChartContainer config={CONFIG} className="aspect-auto! h-full! w-full">
          <PieChart>
            <ChartTooltip content={<MinutesTooltip />} />
            <Pie
              data={slices}
              dataKey="minutes"
              nameKey="label"
              innerRadius="64%"
              outerRadius="100%"
              stroke="var(--card)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {slices.map((s) => (
                <Cell key={s.key} fill={s.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`${large ? "text-4xl" : "text-xl"} font-semibold tabular-nums`}
          >
            {formatDuration(logged)}
          </span>
          <span className="text-xs text-muted-foreground">
            of {formatDuration(targetMinutes)}
          </span>
        </div>
      </div>
      <ul
        className={`space-y-1.5 text-sm ${large ? "max-h-[65vh] min-w-0 flex-1 overflow-y-auto pr-2" : ""}`}
      >
        {slices.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: s.fill }}
            />
            <span
              className={`min-w-0 flex-1 truncate ${s.kind === "remaining" ? "text-muted-foreground" : ""}`}
              title={s.label}
            >
              {s.label}
            </span>
            <span className="tabular-nums text-muted-foreground">
              {formatDuration(s.minutes)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BarBody({ bars, large }: { bars: BarItem[]; large?: boolean }) {
  const max = large ? 40 : 12;
  return (
    <ChartContainer
      config={CONFIG}
      className={large ? "h-full! min-h-64 w-full" : "h-56! w-full"}
    >
      <BarChart data={bars} margin={{ top: 8, right: 4, bottom: 0, left: -10 }}>
        <CartesianGrid
          vertical={false}
          stroke="var(--border)"
          strokeDasharray="4 4"
        />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          interval={0}
          tick={tick}
          tickFormatter={(v: string) =>
            v.length > max ? `${v.slice(0, max - 1)}…` : v
          }
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          width={48}
          tick={tick}
          tickFormatter={(m: number) => `${+(m / 60).toFixed(1)}h`}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={<MinutesTooltip />}
        />
        <Bar
          dataKey="minutes"
          radius={[4, 4, 0, 0]}
          maxBarSize={large ? 96 : 48}
          isAnimationActive={false}
        >
          {bars.map((b) => (
            <Cell key={b.key} fill={b.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

/** SCR-043 / FR-TLOG-016: pie (a slice per log + grey remaining) and a bar per project or task, stacked. Each can open full size. */
export function DayCharts({
  logs,
  targetMinutes,
  by
}: {
  logs: TimeLog[];
  targetMinutes: number;
  by: "project" | "task";
}) {
  const [expanded, setExpanded] = useState<"pie" | "bar" | null>(null);
  if (logs.length === 0) {
    return (
      <Card className="border rounded-md!">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nothing logged yet.
        </CardContent>
      </Card>
    );
  }
  const colours = logColors(logs);
  const slices: Slice[] = pieSlices(logs, targetMinutes).map((s) => ({
    ...s,
    fill: s.kind === "remaining" ? "var(--muted)" : colours[s.key]
  }));
  const bars: BarItem[] = barBars(logs, by).map((b) => ({
    ...b,
    fill:
      b.key === "unsorted" || b.key === "nonprod"
        ? "var(--muted-foreground)"
        : "var(--chart-2)"
  }));
  const logged = logs.reduce((s, l) => s + l.durationMinutes, 0);
  const pieTitle = (
    <>
      <PieIcon size={16} className="text-muted-foreground" /> Time by log
    </>
  );
  const barTitle = (
    <>
      <BarChart3 size={16} className="text-muted-foreground" /> Time by {by}
    </>
  );

  return (
    <div className="space-y-4">
      <Card className="gap-0! border rounded-md! py-0!">
        <CardHeader className={HEADER}>
          <CardTitle className="flex items-center gap-2 text-sm">
            {pieTitle}
          </CardTitle>
          <ExpandButton
            label="Time by log"
            onClick={() => setExpanded("pie")}
          />
        </CardHeader>
        <CardContent className="p-5">
          <PieBody
            slices={slices}
            logged={logged}
            targetMinutes={targetMinutes}
          />
        </CardContent>
      </Card>
      <Card className="gap-0! border rounded-md! py-0!">
        <CardHeader className={HEADER}>
          <CardTitle className="flex items-center gap-2 text-sm">
            {barTitle}
          </CardTitle>
          <ExpandButton
            label={`Time by ${by}`}
            onClick={() => setExpanded("bar")}
          />
        </CardHeader>
        <CardContent className="p-5">
          <BarBody bars={bars} />
        </CardContent>
      </Card>
      <Dialog
        open={expanded !== null}
        onOpenChange={(o) => !o && setExpanded(null)}
      >
        <DialogContent className="flex! h-[90vh] w-[95vw]! max-w-none! flex-col gap-4 sm:max-w-none!">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {expanded === "bar" ? barTitle : pieTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col justify-center">
            {expanded === "bar" ? (
              <BarBody bars={bars} large />
            ) : (
              <PieBody
                slices={slices}
                logged={logged}
                targetMinutes={targetMinutes}
                large
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
