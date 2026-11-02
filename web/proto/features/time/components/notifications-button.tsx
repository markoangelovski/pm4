"use client";

import { useState } from "react";
import { Bell, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger
} from "@/components/ui/popover";
import { formatDuration, today as todayIn } from "@/lib/time";
import { formatClock } from "@/lib/time/clock";
import { useAttention } from "@/proto/features/system/use-attention";
import { useMe } from "@/proto/features/users/api";
import { useDay, useNowMinute } from "../api";
import {
  dismissalOf,
  isDismissed,
  logReminder,
  type ReminderDismissal
} from "../reminder";
import { LogFormDialog } from "./log-form-dialog";

/**
 * The header's notifications: a bell with a dot while there is one, and a list in a popover. Its one notification is
 * the reminder to log time (see `logReminder`); clicking it opens Log time, its × dismisses it until another 15 min
 * are unlogged. While it shows, the tab's title and favicon and the installed app's icon show it too.
 */
export function NotificationsButton() {
  const me = useMe();
  const timeZone = me.data?.timeZone ?? "UTC";
  const workDate = todayIn(timeZone);
  const day = useDay(workDate);
  const now = useNowMinute(timeZone, true);
  const reminder =
    day.data && me.data
      ? logReminder(day.data, now, me.data.dailyTargetMinutes)
      : null;
  // Until reload, like the last log's project and task.
  const [dismissal, setDismissal] = useState<ReminderDismissal | null>(null);
  const shown =
    reminder && !isDismissed(workDate, reminder, dismissal) ? reminder : null;
  const count = shown ? 1 : 0;
  const [open, setOpen] = useState(false);
  const [logging, setLogging] = useState(false);
  useAttention(count);

  const label = count ? `Notifications (${count} new)` : "Notifications";
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label={label}
              title={label}
              className="relative cursor-pointer rounded-full hover:bg-primary/5"
            />
          }
        >
          <Bell size={19} />
          {count ? (
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive ring-2 ring-background" />
          ) : null}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 gap-2 p-2">
          <PopoverHeader className="px-2 pt-1">
            <PopoverTitle className="text-sm">Notifications</PopoverTitle>
          </PopoverHeader>
          {shown ? (
            <div className="flex items-start gap-1 rounded-md hover:bg-muted">
              <button
                type="button"
                className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-md p-2 text-left"
                onClick={() => {
                  setOpen(false);
                  setLogging(true);
                }}
              >
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Clock className="size-4" />
                </span>
                <span className="grid gap-0.5">
                  <span className="text-sm font-medium">Log your time</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDuration(shown.unlogged)} unlogged since{" "}
                    {formatClock(shown.since)}
                  </span>
                </span>
              </button>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Dismiss"
                title="Dismiss"
                className="mt-2 mr-1 cursor-pointer text-muted-foreground"
                onClick={() => setDismissal(dismissalOf(workDate, shown))}
              >
                <X />
              </Button>
            </div>
          ) : (
            <p className="px-2 pb-2 text-sm text-muted-foreground">
              No notifications.
            </p>
          )}
        </PopoverContent>
      </Popover>
      <LogFormDialog
        open={logging}
        onOpenChange={setLogging}
        defaultDate={workDate}
      />
    </>
  );
}
