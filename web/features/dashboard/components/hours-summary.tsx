"use client";

import { Hourglass, Target, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@/lib/time";
import type { Totals } from "../stats";

const pct = (part: number, whole: number) =>
  whole > 0 ? Math.floor((part / whole) * 100) : 0;

function Meter({
  label,
  percent,
  detail,
  color
}: {
  label: string;
  percent: number;
  detail: string;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium tabular-nums">{percent}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(percent, 100)}%`,
            background: color
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

/** SCR-010 / FR-RPT-004: worked · target · booked. */
export function HoursSummary({
  totals,
  targetMinutes
}: {
  totals: Totals;
  targetMinutes: number;
}): React.JSX.Element {
  const { worked, booked, target, workdays } = totals;
  const scale = Math.max(worked, target);
  const diff = worked - target;
  const unbooked = Math.max(worked - booked, 0);
  return (
    <Card className="h-full gap-0! border rounded-md! py-0!">
      <CardHeader className="flex h-11 flex-row items-center border-b px-4 py-0! pb-0!">
        <CardTitle className="text-sm">Worked · target · booked</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 p-5">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Worked</div>
            <div className="text-xl font-semibold tabular-nums">
              {formatDuration(worked)}
            </div>
            <div className="text-xs text-muted-foreground">Sum of all logs</div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="inline-block w-3 border-t border-dashed border-foreground" />
              Target
            </div>
            <div className="text-xl font-semibold tabular-nums">
              {formatDuration(target)}
            </div>
            <div className="text-xs text-muted-foreground">
              {`${workdays} day${workdays === 1 ? "" : "s"} × ${formatDuration(targetMinutes)}`}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Booked</div>
            <div className="text-xl font-semibold tabular-nums">
              {formatDuration(booked)}
            </div>
            <div className="text-xs text-muted-foreground">
              Logs that are booked
            </div>
          </div>
        </div>
        <div className="relative pt-4">
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${scale > 0 ? (worked / scale) * 100 : 0}%`,
                background: "var(--dash-worked)"
              }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${worked > 0 ? Math.min((booked / worked) * 100, 100) : 0}%`,
                  background: "var(--dash-booked)"
                }}
              />
            </div>
          </div>
          {target > 0 && scale > 0 ? (
            <div
              className="absolute top-0 bottom-0 flex flex-col items-center"
              style={{ left: `${(target / scale) * 100}%` }}
            >
              <span className="text-[10px] text-muted-foreground">Target</span>
              <span className="h-3 border-l-2 border-dashed border-foreground" />
            </div>
          ) : null}
        </div>
        <div className="text-sm">
          {workdays === 0 ? (
            <span className="text-muted-foreground">
              No workdays in this range yet.
            </span>
          ) : diff === 0 ? (
            <span className="flex items-center gap-1.5">
              <Target size={16} />
              On target
            </span>
          ) : diff > 0 ? (
            <span className="flex items-center gap-1.5">
              <TrendingUp size={16} />
              {formatDuration(diff)} over target
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <Hourglass size={16} />
              {formatDuration(-diff)} under target
            </span>
          )}
        </div>
        <Meter
          label="Worked of target"
          percent={pct(worked, target)}
          color="var(--dash-worked)"
          detail={
            target > 0
              ? `${formatDuration(worked)} of ${formatDuration(target)}`
              : "No workdays in this range"
          }
        />
        <Meter
          label="Booked of worked"
          percent={pct(booked, worked)}
          color="var(--dash-booked)"
          detail={
            unbooked > 0
              ? `${formatDuration(unbooked)} still to book`
              : "Everything is booked"
          }
        />
        {worked > 0 && unbooked === 0 ? (
          <p className="text-xs text-muted-foreground">
            All worked hours are booked.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
