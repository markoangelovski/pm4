"use client";

import { CircleCheck, Hourglass, Scale, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Totals } from "../stats";

const hours = (m: number) => (m === 0 ? "0h" : formatDuration(m));
/** Floored, so "100%" never sits beside "15m under target". */
const pct = (part: number, whole: number) =>
  whole > 0 ? Math.floor((part / whole) * 100) : 0;

function Figure({
  color,
  label,
  value,
  sub,
  dashed
}: {
  color: string;
  label: string;
  value: string;
  sub: string;
  dashed?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {dashed ? (
          <span
            className="h-3 border-l-2 border-dashed"
            style={{ borderColor: color }}
          />
        ) : (
          <span
            className="size-2.5 rounded-[2px]"
            style={{ background: color }}
          />
        )}
        {label}
      </p>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <p className="truncate text-xs text-muted-foreground" title={sub}>
        {sub}
      </p>
    </div>
  );
}

/**
 * Worked, target and booked on one scale (as in production, 36px tall): the worked bar, the booked
 * bar inside it, and a dashed line crossing it where the target is.
 */
function Bullet({ t }: { t: Totals }) {
  const scale = Math.max(t.worked, t.target);
  return (
    <div
      className="relative pt-4"
      role="img"
      aria-label={`Worked ${hours(t.worked)}, booked ${hours(t.booked)}, target ${hours(t.target)}`}
    >
      <div className="h-9 overflow-hidden rounded-md bg-muted">
        <div
          className="h-full rounded-md"
          style={{
            width: `${scale > 0 ? (t.worked / scale) * 100 : 0}%`,
            background: "var(--dash-worked)"
          }}
        >
          <div
            className="h-full rounded-md"
            style={{
              width: `${t.worked > 0 ? Math.min((t.booked / t.worked) * 100, 100) : 0}%`,
              background: "var(--dash-booked)"
            }}
          />
        </div>
      </div>
      {t.target > 0 && scale > 0 ? (
        <div
          className="absolute top-0 bottom-0 flex -translate-x-1/2 flex-col items-center"
          style={{ left: `${(t.target / scale) * 100}%` }}
        >
          <span className="text-[10px] text-muted-foreground">Target</span>
          <span className="h-9 border-l-2 border-dashed border-foreground" />
        </div>
      ) : null}
    </div>
  );
}

function Meter({
  label,
  value,
  of,
  color,
  hint
}: {
  label: string;
  value: number;
  of: number;
  color: string;
  hint: string;
}) {
  const p = pct(value, of);
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{p}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, p)}%`, background: color }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

/** The three totals of the range, how they relate, and what's left to do. */
export function HoursSummary({
  t,
  targetMinutes
}: {
  t: Totals;
  targetMinutes: number;
}) {
  const diff = t.worked - t.target;
  const unbooked = t.worked - t.booked;
  return (
    <Card className="h-full gap-0! border rounded-md! py-0!">
      <CardHeader className="flex h-11 flex-row items-center border-b px-4 py-0!">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Scale size={16} className="text-muted-foreground" /> Worked · target
          · booked
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 p-5">
        <div className="grid grid-cols-3 gap-3">
          <Figure
            color="var(--dash-worked)"
            label="Worked"
            value={hours(t.worked)}
            sub="Sum of all logs"
          />
          <Figure
            color="var(--foreground)"
            label="Target"
            value={hours(t.target)}
            dashed
            sub={`${t.workdays} ${t.workdays === 1 ? "day" : "days"} × ${hours(targetMinutes)}`}
          />
          <Figure
            color="var(--dash-booked)"
            label="Booked"
            value={hours(t.booked)}
            sub="Logs that are booked"
          />
        </div>
        <Bullet t={t} />
        <div
          className={cn(
            "flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm",
            diff >= 0 && "bg-primary/5"
          )}
        >
          {diff >= 0 ? (
            <TrendingUp className="size-4 shrink-0" />
          ) : (
            <Hourglass className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          )}
          <span>
            {t.target === 0 ? (
              "No workdays in this range yet."
            ) : diff >= 0 ? (
              <>
                <span className="font-semibold">{hours(diff)}</span> over target
              </>
            ) : (
              <>
                <span className="font-semibold">{hours(-diff)}</span> under
                target
              </>
            )}
          </span>
        </div>
        <div className="space-y-4">
          <Meter
            label="Worked of target"
            value={t.worked}
            of={t.target}
            color="var(--dash-worked)"
            hint={
              t.target
                ? `${hours(t.worked)} of ${hours(t.target)}`
                : "No workdays in this range"
            }
          />
          <Meter
            label="Booked of worked"
            value={t.booked}
            of={t.worked}
            color="var(--dash-booked)"
            hint={
              unbooked > 0
                ? `${hours(unbooked)} still to book`
                : "Everything is booked"
            }
          />
        </div>
        {unbooked === 0 && t.worked > 0 ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CircleCheck className="size-3.5" /> All worked hours are booked.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
