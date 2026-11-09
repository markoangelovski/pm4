"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDuration } from "@/lib/time";
import { formatClock } from "@/lib/time/clock";
import { cn } from "@/lib/utils";
import { useNowMinute } from "../api";
import { timeline } from "../day";
import type { Day, Ref } from "../types";
import { DeletedName } from "./deleted-marker";

function RefName({ ref_ }: { ref_: Ref }) {
  return !ref_.id || ref_.deleted ? (
    <DeletedName title={ref_.title} />
  ) : (
    <>{ref_.title}</>
  );
}

/** Elapsed axis label when the day has no start: 0h, 1h, 2h… */
const elapsed = (m: number) => `${m / 60}h`;

/** SCR-040 Timeline view: the day's logs as staggered bars, each starting where the previous one ended
 *  (the landing page's hero timeline, on the real day). Today, a line marks now. */
export function LogTimeline({
  day,
  colors,
  isToday,
  timeZone
}: {
  day: Day;
  colors: Record<string, string>;
  isToday: boolean;
  timeZone: string;
}) {
  const now = useNowMinute(timeZone, isToday);
  const t = timeline(day.startMinute, day.logs, now);
  const span = t.axisEnd - t.axisStart;
  const pct = (m: number) => `${((m - t.axisStart) / span) * 100}%`;
  const label = t.clock ? formatClock : elapsed;
  const showNow =
    t.clock && now !== null && now >= t.axisStart && now <= t.axisEnd;

  return (
    <Card className="border rounded-md! gap-0 px-4 py-4">
      <ol className="flex flex-col gap-3">
        {t.rows.map(({ log, from, to }, i) => (
          <li key={log.id} className="flex flex-col gap-1.5">
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: colors[log.id] }}
              />
              <span className="min-w-0 truncate">
                {log.project || log.task ? (
                  <span className="text-muted-foreground">
                    {log.project ? <RefName ref_={log.project} /> : null}
                    {log.project && log.task ? " · " : null}
                    {log.task ? <RefName ref_={log.task} /> : null}
                    {" · "}
                  </span>
                ) : null}
                {log.title ? (
                  <span className="font-semibold">{log.title} </span>
                ) : null}
                {log.text}
              </span>
              {log.excludeFromStats ? (
                <Badge variant="outline" className="shrink-0">
                  Non-prod
                </Badge>
              ) : null}
              <span className="ml-auto hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:inline">
                {label(from)}–{label(to)}
              </span>
              <span className="shrink-0 font-medium tabular-nums sm:w-16 sm:text-right">
                {formatDuration(log.durationMinutes)}
              </span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-muted">
              <span
                className="absolute inset-y-0 rounded-full fill-mode-both motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-3 motion-safe:duration-500"
                style={{
                  left: pct(from),
                  width: `${(log.durationMinutes / span) * 100}%`,
                  background: colors[log.id],
                  animationDelay: `${Math.min(i, 12) * 60}ms`
                }}
              />
              {showNow && now !== null ? (
                <span
                  aria-hidden
                  className="absolute inset-y-0 w-px bg-foreground/60"
                  style={{ left: pct(now) }}
                />
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      <div
        aria-hidden
        className="relative mt-2 h-4 text-[11px] tabular-nums text-muted-foreground"
      >
        {t.ticks.map((tick, i) => (
          <span
            key={tick}
            className={cn(
              "absolute",
              i === 0
                ? ""
                : i === t.ticks.length - 1
                  ? "-translate-x-full"
                  : "-translate-x-1/2"
            )}
            style={{ left: pct(tick) }}
          >
            {label(tick)}
          </span>
        ))}
      </div>
      {showNow && now !== null ? (
        <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
          Now {formatClock(now)}
        </p>
      ) : null}
    </Card>
  );
}
