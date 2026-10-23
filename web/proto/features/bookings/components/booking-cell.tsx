"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { BookmarkCheck, Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateField } from "@/proto/features/time/components/date-field";
import { parseDurationInput } from "@/proto/features/time/duration";
import { formatDuration, formatWorkDate } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useSetBooking } from "../api";
import {
  addBooking,
  removeBooking,
  unbookedMinutes,
  type BookingDto,
  type BookingEntry
} from "../days";

/** Dark green when a log is booked to the day it was worked, dark yellow when booked to another day. */
export const bookedTone = (sameDay: boolean) =>
  sameDay
    ? "text-green-700 dark:text-green-400"
    : "text-yellow-700 dark:text-yellow-500";

/** What a log row's booking controls hold while the user edits them (the date field and the time input). */
interface BookingDraft {
  editing: boolean;
  date: string;
  time: string;
}

type Drafts = Record<string, BookingDraft>;

const DraftsContext = createContext<{
  drafts: Drafts;
  setDrafts: (update: (drafts: Drafts) => Drafts) => void;
} | null>(null);

/** Holds the drafts of one day's log rows, so a row's Booking date and Booking time cells share them. */
export function BookingDraftsProvider({ children }: { children: ReactNode }) {
  const [drafts, setDrafts] = useState<Drafts>({});
  return (
    <DraftsContext.Provider value={{ drafts, setDrafts }}>
      {children}
    </DraftsContext.Provider>
  );
}

/** A row's key: the log and the booking it shows (`rest` for the unbooked part). */
const keyOf = (entry: BookingEntry) =>
  `${entry.log.id}:${entry.booking?.date ?? "rest"}`;

/** The row's draft (by default: not editing, the work date and the row's minutes), a patch and a reset. */
function useDraft(entry: BookingEntry) {
  const ctx = useContext(DraftsContext);
  if (!ctx) throw new Error("BookingDraftsProvider is missing");
  const key = keyOf(entry);
  const draft = ctx.drafts[key] ?? {
    editing: false,
    date: entry.booking?.date ?? entry.log.workDate,
    time: formatDuration(entry.minutes)
  };
  const patch = (next: Partial<BookingDraft>) =>
    ctx.setDrafts((d) => ({ ...d, [key]: { ...draft, ...next } }));
  const reset = () =>
    ctx.setDrafts((d) => {
      const { [key]: _gone, ...rest } = d;
      void _gone;
      return rest;
    });
  return { draft, patch, reset };
}

/** The most the row's time input may book: the unbooked minutes, plus the booking's own when editing it. */
const maxMinutes = (entry: BookingEntry) =>
  unbookedMinutes(entry.log) + (entry.booking?.minutes ?? 0);

/** The draft time as minutes, or the reason it can't be booked. */
function parseTime(
  entry: BookingEntry,
  time: string
): { ok: true; minutes: number } | { ok: false; error: string } {
  const parsed = parseDurationInput(time);
  if (!parsed.ok) return { ok: false, error: "Use 15-minute steps." };
  const max = maxMinutes(entry);
  if (parsed.minutes > max)
    return { ok: false, error: `At most ${formatDuration(max)}.` };
  return parsed;
}

/**
 * A bookable log row's Booking date cell (FR-BOOK-004): on the unbooked row, a date field and **Book**; on a booking,
 * the date with **Edit booking date** (date field, ✓ and ×) and **Remove booking**. Changes save at once.
 */
export function BookingDateCell({
  entry,
  max
}: {
  entry: BookingEntry;
  max: string;
}) {
  const set = useSetBooking();
  const { draft, patch, reset } = useDraft(entry);
  const { log, booking } = entry;
  const time = parseTime(entry, draft.time);

  const save = (bookings: BookingDto[]) =>
    set.mutate(
      { logs: [{ logId: log.id, bookings }] },
      {
        onSuccess: reset,
        onError: () => toast.error("Couldn't save the booking.")
      }
    );

  if (booking && !draft.editing) {
    return (
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "flex items-center gap-1.5 text-sm font-medium",
            bookedTone(booking.date === log.workDate)
          )}
        >
          <BookmarkCheck className="size-4 shrink-0" />
          {formatWorkDate(booking.date)}
        </span>
        <span className="flex shrink-0">
          <Button
            variant="ghost"
            size="icon-sm"
            className="cursor-pointer"
            aria-label="Edit booking"
            disabled={set.isPending}
            onClick={() => patch({ editing: true })}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="cursor-pointer"
            aria-label="Remove booking"
            disabled={set.isPending}
            onClick={() => save(removeBooking(log.bookings, booking.date))}
          >
            <X />
          </Button>
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <DateField
          value={draft.date}
          onChange={(date) => patch({ date })}
          max={max}
        />
      </div>
      {booking ? (
        <>
          <Button
            size="icon"
            className="cursor-pointer"
            aria-label="Save booking"
            disabled={set.isPending || !time.ok}
            onClick={() =>
              time.ok &&
              save(
                addBooking(
                  removeBooking(log.bookings, booking.date),
                  draft.date,
                  time.minutes
                )
              )
            }
          >
            <Check />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="cursor-pointer"
            aria-label="Cancel"
            disabled={set.isPending}
            onClick={reset}
          >
            <X />
          </Button>
        </>
      ) : (
        <Button
          className="cursor-pointer rounded-md!"
          disabled={set.isPending || !time.ok}
          onClick={() =>
            time.ok && save(addBooking(log.bookings, draft.date, time.minutes))
          }
        >
          Book
        </Button>
      )}
    </div>
  );
}

/**
 * A bookable log row's Booking time cell: a booking's time, or (on the unbooked row and while editing) a duration
 * input in 15-minute steps, at most the time left to book. The unbooked row starts at all of it.
 */
export function BookingTimeCell({ entry }: { entry: BookingEntry }) {
  const { draft, patch } = useDraft(entry);
  const time = parseTime(entry, draft.time);

  if (entry.booking && !draft.editing)
    return (
      <span className="tabular-nums">
        {formatDuration(entry.booking.minutes)}
      </span>
    );

  return (
    <div className="flex flex-col gap-1">
      <Input
        aria-label="Booking time"
        aria-invalid={!time.ok || undefined}
        value={draft.time}
        onChange={(e) => patch({ time: e.target.value })}
        className="h-8 tabular-nums"
      />
      {time.ok ? null : (
        <span className="text-xs text-destructive">{time.error}</span>
      )}
    </div>
  );
}
