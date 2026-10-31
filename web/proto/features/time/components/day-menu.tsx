"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  MoreHorizontal,
  Sparkles,
  Trash2,
  Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { routes } from "@/proto/lib/routes";
import { dayAnchor, monthUpTo } from "@/proto/features/bookings/days";
import type { PmspaAction } from "@/proto/features/integrations/components/push-button";
import type { Day } from "../types";
import { DayPromptDialog } from "./day-prompt-dialog";
import { DeleteDayDialog } from "./delete-day-dialog";

/** Bookings over the day's month (up to today, or to the day if it is later), scrolled to the day's section. */
function bookingsHref(workDate: string, today: string) {
  const range = monthUpTo(workDate, today);
  const to = workDate > range.to ? workDate : range.to;
  const params = new URLSearchParams({ from: range.from, to });
  return `${routes.app.bookings}?${params}#${dayAnchor(workDate)}`;
}

/**
 * SCR-040's ⋯ menu on the date row, in this order:
 * - **Go to Bookings**: the day's section on Bookings, scrolled into view and outlined; disabled while the day has
 *   no logs (Bookings doesn't list it);
 * - **Prompt**, disabled while the day has no logs;
 * - **Push to PMSPA** (FR-INT-012): `push`, from the day view's `usePmspaAction` (absent or hidden without a saved
 *   PMSPA connection → no item); disabled while the day has no logs or the connection isn't Connected, with the
 *   reason as the item's title. The day view renders `push.dialog`, so the menu itself reads nothing from the API;
 * - **Delete day**, disabled while the day has no start and no logs.
 */
export function DayMenu({
  day,
  today,
  push
}: {
  day: Day;
  /** Today in the user's time zone: the Bookings range ends here unless the day is later. */
  today: string;
  push?: PmspaAction;
}) {
  const [prompting, setPrompting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const noLogs = day.logs.length === 0;
  const empty = day.startMinute === null && noLogs;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              aria-label="Day actions"
              className="cursor-pointer"
            />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-max">
          <DropdownMenuItem
            disabled={noLogs}
            className="cursor-pointer"
            // Disabled, it isn't a link: middle-click or "Open in new tab" would reach a day Bookings doesn't list.
            render={
              noLogs ? undefined : (
                <Link href={bookingsHref(day.workDate, today)} />
              )
            }
          >
            <CalendarCheck /> Go to Bookings
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={noLogs}
            className="cursor-pointer"
            onClick={() => setPrompting(true)}
          >
            <Sparkles /> Prompt
          </DropdownMenuItem>
          {push && !push.hidden && (
            <DropdownMenuItem
              disabled={push.disabled}
              title={push.hint}
              // A disabled item gets no pointer events, so its title would never show: this one keeps hover
              // (Base UI still blocks the click).
              className="cursor-pointer data-disabled:pointer-events-auto data-disabled:cursor-default"
              onClick={push.start}
            >
              <Upload /> Push to PMSPA
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            variant="destructive"
            disabled={empty}
            className="cursor-pointer"
            onClick={() => setDeleting(true)}
          >
            <Trash2 /> Delete day
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DayPromptDialog day={day} open={prompting} onOpenChange={setPrompting} />
      <DeleteDayDialog day={day} open={deleting} onOpenChange={setDeleting} />
    </>
  );
}
