"use client";

import { useEffect, useRef, useState } from "react";
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
import {
  closeDesktopNotification,
  isPageInFocus,
  showDesktopNotification,
  turnOnDesktopNotifications,
  useDesktopNotifications
} from "@/proto/features/system/desktop-notifications";
import { useAttention } from "@/proto/features/system/use-attention";
import { useMe, type Me } from "@/proto/features/users/api";
import { useDay, useNowMinute } from "../api";
import {
  dismissalOf,
  isDismissed,
  logReminder,
  REMINDER_STEP,
  reminderMinutes,
  type LogReminder,
  type ReminderDismissal
} from "../reminder";
import { LogFormDialog } from "./log-form-dialog";

/**
 * The header's notifications: a bell with a dot while there is one, and a list in a popover. Its one notification is
 * the reminder to log time (see `logReminder`). While it shows, Log time is open for today with its unlogged time
 * (`reminderMinutes`). Closing Log time keeps the reminder in the bell, where Log your time opens it again; Log time
 * opens by itself again once another 15 min are unlogged or a log is saved. The reminder's × dismisses it (and stops
 * Log time opening) until another 15 min are unlogged or a log is saved. While it shows, the tab's title and favicon
 * and the installed app's icon show it too, and at each new step a desktop notification while PM4 isn't in focus.
 * Today's date needs the user's time zone, so until it loads the bell has no notifications and reads no day.
 */
export function NotificationsButton() {
  const me = useMe();
  return me.data ? <LogReminderBell me={me.data} /> : <NotificationsPopover />;
}

/** The bell with the reminder to log time for today, in the user's time zone. */
function LogReminderBell({ me }: { me: Me }) {
  const workDate = todayIn(me.timeZone);
  const day = useDay(workDate);
  const now = useNowMinute(me.timeZone, true);
  const reminder = day.data
    ? logReminder(day.data, now, me.dailyTargetMinutes)
    : null;
  // Both until reload, like the last log's project and task: the bell's ×, and closing the Log time it opened.
  const [dismissal, setDismissal] = useState<ReminderDismissal | null>(null);
  const [closed, setClosed] = useState<ReminderDismissal | null>(null);
  const shown =
    reminder && !isDismissed(workDate, reminder, dismissal) ? reminder : null;
  // Log time opens by itself for each new reminder step; the bell's Log your time opens it again.
  const [logging, setLogging] = useState(false);
  const open =
    shown !== null && (logging || !isDismissed(workDate, shown, closed));
  useAttention(shown ? 1 : 0);
  useReminderNotification(workDate, shown);
  return (
    <>
      <NotificationsPopover
        reminder={shown}
        onLog={() => setLogging(true)}
        onDismiss={(r) => setDismissal(dismissalOf(workDate, r))}
      />
      {/* A saved log refetches the day before the dialog closes; a new `since` mounts a fresh form for the new reminder. */}
      <LogFormDialog
        key={shown?.since}
        open={open}
        // Closes over the reminder this dialog opened for: after a save, the new reminder stays open (AC-5).
        onOpenChange={(next) => {
          if (next) return;
          setLogging(false);
          if (shown) setClosed(dismissalOf(workDate, shown));
        }}
        defaultDate={workDate}
        defaultMinutes={shown ? reminderMinutes(shown) : undefined}
      />
    </>
  );
}

const REMINDER_TAG = "pm4-log-reminder";

/**
 * A desktop notification for each new step of the reminder (the moments Log time opens by itself: a new day, start +
 * logged or 15 min unlogged), only while PM4 isn't in focus. It goes away when the reminder does.
 */
function useReminderNotification(workDate: string, shown: LogReminder | null) {
  const step = shown
    ? `${workDate}|${shown.since}|${Math.floor(shown.unlogged / REMINDER_STEP)}`
    : null;
  const notified = useRef<string | null>(null);
  useEffect(() => {
    if (step === notified.current) return;
    notified.current = step;
    if (!shown) {
      void closeDesktopNotification(REMINDER_TAG);
      return;
    }
    if (isPageInFocus()) return;
    void showDesktopNotification({
      title: "Log your time",
      body: `${formatDuration(shown.unlogged)} of billable time unlogged`,
      tag: REMINDER_TAG
    });
  }, [step, shown]);
}

/** The bell and its popover, listing the reminder when there is one. */
function NotificationsPopover({
  reminder = null,
  onLog,
  onDismiss
}: {
  reminder?: LogReminder | null;
  onLog?: () => void;
  onDismiss?: (reminder: LogReminder) => void;
}) {
  const count = reminder ? 1 : 0;
  const [open, setOpen] = useState(false);
  const label = count ? `Notifications (${count} new)` : "Notifications";
  return (
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
        {reminder ? (
          <div className="flex items-start gap-1 rounded-md hover:bg-muted">
            <button
              type="button"
              className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-md p-2 text-left"
              onClick={() => {
                setOpen(false);
                onLog?.();
              }}
            >
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Clock className="size-4" />
              </span>
              <span className="grid gap-0.5">
                <span className="text-sm font-medium">Log your time</span>
                <span className="text-xs text-muted-foreground">
                  {formatDuration(reminder.unlogged)} of billable time unlogged
                </span>
              </span>
            </button>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Dismiss"
              title="Dismiss"
              className="mt-2 mr-1 cursor-pointer text-muted-foreground"
              onClick={() => onDismiss?.(reminder)}
            >
              <X />
            </Button>
          </div>
        ) : (
          <p className="px-2 pb-2 text-sm text-muted-foreground">
            No notifications.
          </p>
        )}
        <DesktopNotificationsOffer />
      </PopoverContent>
    </Popover>
  );
}

/** While desktop notifications are off (and could be on), a line offering to turn them on. */
function DesktopNotificationsOffer() {
  const state = useDesktopNotifications();
  if (state !== "off") return null;
  return (
    <div className="flex items-center gap-2 border-t px-2 pt-2">
      <p className="flex-1 text-xs text-muted-foreground">
        Get a desktop notification when it&apos;s time to log.
      </p>
      <Button
        variant="outline"
        size="xs"
        className="cursor-pointer"
        onClick={() => void turnOnDesktopNotifications()}
      >
        Turn on
      </Button>
    </div>
  );
}
