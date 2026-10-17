"use client";

import { useEffect, useState } from "react";
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useRefreshPmspaRateLimit, type PmspaConnection } from "../api";

/** The countdown's tick. */
const TICK_MS = 15_000;

/** Below this many requests left, the bar turns amber. */
const LOW = 20;

/** Now, updated every `TICK_MS`. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);
  return now;
}

/**
 * PMSPA's rate limit as its last answer reported it: requests used of the limit and when the window resets.
 * Shared by every PM4 user of the same PMSPA (one outbound IP), so it can drop without this user calling PMSPA.
 */
export function PmspaRateLimit({
  connection,
  tz,
  className
}: {
  connection: PmspaConnection;
  tz: string | undefined;
  className?: string;
}) {
  useRefreshPmspaRateLimit();
  const rateLimit = connection.rateLimit;
  const now = useNow();
  const resetAt = rateLimit ? Date.parse(rateLimit.resetAt) : 0;

  // No PMSPA answer in the current window: the whole limit is free.
  if (!rateLimit || now >= resetAt) {
    return (
      <span className={className}>
        {rateLimit ? `All ${rateLimit.limit} available` : "All available"}
      </span>
    );
  }

  const used = rateLimit.limit - rateLimit.remaining;
  const minutes = Math.max(1, Math.ceil((resetAt - now) / 60_000));
  const time = (iso: string) =>
    tz ? format(new TZDate(iso, tz), "HH:mm") : "";
  const reset = `${time(rateLimit.resetAt)} (in ${minutes} min)`;
  const host = connection.url ? new URL(connection.url).host : "PMSPA";
  const exhausted = rateLimit.remaining === 0;

  return (
    <span
      className={cn("inline-flex flex-wrap items-center gap-x-2", className)}
    >
      <Progress
        value={(used / rateLimit.limit) * 100}
        aria-label="PMSPA requests used"
        className={cn(
          "w-16",
          exhausted
            ? "**:data-[slot=progress-indicator]:bg-destructive"
            : rateLimit.remaining < LOW &&
                "**:data-[slot=progress-indicator]:bg-amber-500"
        )}
      />
      <span className={cn(exhausted && "text-destructive")}>
        {exhausted
          ? `Limit reached, PMSPA calls resume at ${reset}`
          : `${used} of ${rateLimit.limit} used, resets at ${reset}`}
      </span>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label="About the PMSPA rate limit"
              className="inline-flex cursor-help text-muted-foreground"
            />
          }
        >
          <Info className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent className="max-w-72">
          {host} allows {rateLimit.limit} requests per window, shared by every
          PM4 user connected to it. As of PMSPA&apos;s last answer at{" "}
          {time(rateLimit.observedAt)}.
        </TooltipContent>
      </Tooltip>
    </span>
  );
}
