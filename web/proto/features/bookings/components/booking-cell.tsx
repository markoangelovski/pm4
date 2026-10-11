"use client";

import { useState } from "react";
import { BookmarkCheck, Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DateField } from "@/proto/features/time/components/date-field";
import { formatWorkDate } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useSetBooking } from "../api";
import type { BookingLog } from "../days";

/** Dark green when a log is booked to the day it was worked, dark yellow when booked to another day. */
export const bookedTone = (sameDay: boolean) =>
  sameDay
    ? "text-green-700 dark:text-green-400"
    : "text-yellow-700 dark:text-yellow-500";

/** A bookable log's booking (FR-BOOK-004): pick a date and Book it, or (once booked) edit the date or remove the booking. Changes save at once. */
export function BookingCell({ log, max }: { log: BookingLog; max: string }) {
  const set = useSetBooking();
  const { workDate, bookingDate } = log;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(bookingDate ?? workDate);

  const save = (date: string | null, onDone?: () => void) =>
    set.mutate(
      { logIds: [log.id], bookingDate: date },
      {
        onSuccess: onDone,
        onError: () => toast.error("Couldn't save the booking.")
      }
    );

  if (bookingDate && !editing) {
    return (
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "flex items-center gap-1.5 text-sm font-medium",
            bookedTone(bookingDate === workDate)
          )}
        >
          <BookmarkCheck className="size-4 shrink-0" />
          {formatWorkDate(bookingDate)}
        </span>
        <span className="flex shrink-0">
          <Button
            variant="ghost"
            size="icon-sm"
            className="cursor-pointer"
            aria-label="Edit booking date"
            disabled={set.isPending}
            onClick={() => {
              setDraft(bookingDate);
              setEditing(true);
            }}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="cursor-pointer"
            aria-label="Remove booking"
            disabled={set.isPending}
            onClick={() => save(null, () => setDraft(workDate))}
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
        <DateField value={draft} onChange={setDraft} max={max} />
      </div>
      {editing ? (
        <>
          <Button
            size="icon"
            className="cursor-pointer"
            aria-label="Save booking date"
            disabled={set.isPending}
            onClick={() => save(draft, () => setEditing(false))}
          >
            <Check />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="cursor-pointer"
            aria-label="Cancel"
            disabled={set.isPending}
            onClick={() => setEditing(false)}
          >
            <X />
          </Button>
        </>
      ) : (
        <Button
          className="cursor-pointer rounded-md!"
          disabled={set.isPending}
          onClick={() => save(draft)}
        >
          Book
        </Button>
      )}
    </div>
  );
}
