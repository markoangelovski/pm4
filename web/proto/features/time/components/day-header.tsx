"use client";

import { Hourglass, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { formatDuration } from "@/lib/time";
import { formatClock } from "@/lib/time/clock";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNowMinute, useSetDayStart } from "../api";
import { dayFigures } from "../day";
import type { Day } from "../types";
import { START_OPTIONS } from "./log-form-dialog";

/** The template's stat-card structure: label, big value, icon in a bordered square. */
function Stat({
  label,
  icon: Icon,
  prominent,
  tone,
  className,
  children
}: {
  label: string;
  icon?: LucideIcon;
  prominent?: boolean;
  tone?: "warn";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card
      className={cn(
        "border rounded-md! bg-primary/5 ring-primary/20",
        className
      )}
    >
      <CardContent
        className={cn(
          "flex items-start justify-between gap-3",
          prominent ? "py-1" : "py-0"
        )}
      >
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div
            className={cn(
              "font-semibold tabular-nums tracking-tight",
              prominent ? "text-3xl sm:text-4xl" : "text-2xl",

              tone === "warn" && "text-amber-600 dark:text-amber-400"
            )}
          >
            {children}
          </div>
        </div>
        {Icon ? (
          <div
            className={cn(
              "hidden w-fit shrink-0 rounded-md border p-2.5 sm:block",
              prominent
                ? "border-primary/30 bg-background text-primary"
                : "border-border"
            )}
          >
            <Icon size={16} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

const dash = <span className="text-muted-foreground">—</span>;

/** SCR-040 / FR-TLOG-009: Start (editable), Logged and Start + logged are prominent; Now and Unlogged are a compact card. */
export function DayHeader({
  day,
  isToday,
  timeZone,
  targetMinutes
}: {
  day: Day;
  isToday: boolean;
  timeZone: string;
  targetMinutes: number;
}) {
  const now = useNowMinute(timeZone, isToday);
  const f = dayFigures(day.startMinute, day.logs, now, targetMinutes);
  const setStart = useSetDayStart(day.workDate);
  const showToday = isToday && now !== null;
  const percent = f.percentBillable;
  const overtime = f.overtime;
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4",
        showToday
          ? "xl:grid-cols-[1fr_1fr_1fr_minmax(15rem,0.9fr)_minmax(10rem,0.6fr)]"
          : "xl:grid-cols-[1fr_1fr_1fr_minmax(15rem,0.9fr)]"
      )}
    >
      <Stat label="Start" prominent>
        {day.startMinute === null ? (
          dash
        ) : (
          <Select
            items={START_OPTIONS}
            value={day.startMinute}
            onValueChange={(v) =>
              v !== null &&
              setStart.mutate(v as number, {
                onError: () => toast.error("Couldn't save the start time.")
              })
            }
          >
            <SelectTrigger
              aria-label="Day start"
              className="-ml-3 h-auto w-auto leading-none cursor-pointer gap-2 border-transparent bg-transparent px-3 py-0 shadow-none hover:bg-primary/10 dark:bg-transparent **:data-[slot=select-value]:text-2xl sm:**:data-[slot=select-value]:text-3xl **:data-[slot=select-value]:font-semibold [&_svg]:size-4"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64" alignItemWithTrigger={false}>
              {START_OPTIONS.map((o) => (
                <SelectItem
                  key={o.value}
                  value={o.value}
                  className="cursor-pointer"
                >
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Stat>
      <Stat label="Logged" prominent>
        {formatDuration(f.logged)}
      </Stat>
      <Stat
        label="Start + logged"
        prominent
        className="col-span-2 sm:col-span-1"
      >
        {f.startPlusLogged ?? dash}
      </Stat>
      <Card className="col-span-2 border rounded-md! sm:col-span-3 xl:col-span-1">
        <CardContent className="flex h-full flex-col justify-center gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="shrink-0 whitespace-nowrap text-sm text-muted-foreground">
              Billable (%)
            </span>
            <span className="whitespace-nowrap text-xl font-semibold tabular-nums">
              {f.billable === 0 ? "0h" : formatDuration(f.billable)}{" "}
              <span className="text-sm font-medium text-muted-foreground">
                ({percent}%)
              </span>
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-muted-foreground">Overtime</span>
            <span className="text-xl font-semibold tabular-nums">
              {overtime === 0 ? "0h" : formatDuration(overtime)}
            </span>
          </div>
        </CardContent>
      </Card>
      {showToday ? (
        <Card className="col-span-2 border rounded-md! sm:col-span-3 xl:col-span-1">
          <CardContent className="flex h-full flex-col justify-center gap-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm text-muted-foreground">Now</span>
              <span className="text-xl font-semibold tabular-nums">
                {formatClock(now)}
              </span>
            </div>
            {f.unlogged !== null ? (
              <div className="flex items-center justify-between gap-2 text-amber-600 dark:text-amber-400">
                <span className="flex items-center gap-1.5 text-sm">
                  <Hourglass className="size-3.5" /> Unlogged
                </span>
                <span className="text-xl font-semibold tabular-nums">
                  {formatDuration(f.unlogged)}
                </span>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
