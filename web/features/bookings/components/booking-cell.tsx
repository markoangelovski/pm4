"use client";

import { useState } from "react";
import { Bookmark, Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DateField } from "@/features/time/components/date-field";
import { formatWorkDate } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useSetBooking } from "../api";
import type { BookingLog } from "../days";

/** Green when booked to the day it was worked, amber otherwise. */
export const bookedTone = (sameDay: boolean): string =>
  sameDay
    ? "text-green-700 dark:text-green-400"
    : "text-yellow-700 dark:text-yellow-500";

/** A bookable log's booking controls (FR-BOOK-004). Changes save at once. */
export function BookingCell({ log, max }: { log: BookingLog; max: string }) {
  const set = useSetBooking();
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(log.bookingDate ?? log.workDate);

  const save = (bookingDate: string | null, onDone?: () => void) =>
    set.mutate(
      { logIds: [log.id], bookingDate },
      {
        onSuccess: onDone,
        onError: () => toast.error("Couldn't save the booking.")
      }
    );

  if (log.bookingDate && !editing) {
    return (
      <div className="flex items-center gap-1">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 whitespace-nowrap",
            bookedTone(log.bookingDate === log.workDate)
          )}
        >
          <Bookmark className="size-4" />
          {formatWorkDate(log.bookingDate)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="cursor-pointer"
          aria-label="Edit booking date"
          disabled={set.isPending}
          onClick={() => {
            setDate(log.bookingDate ?? log.workDate);
            setEditing(true);
          }}
        >
          <Pencil />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="cursor-pointer"
          aria-label="Remove booking"
          disabled={set.isPending}
          onClick={() => save(null, () => setDate(log.workDate))}
        >
          <X />
        </Button>
      </div>
    );
  }

  if (log.bookingDate) {
    return (
      <div className="flex items-center gap-1">
        <div className="w-40">
          <DateField value={date} onChange={setDate} max={max} />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="cursor-pointer"
          aria-label="Save booking date"
          disabled={set.isPending}
          onClick={() => save(date, () => setEditing(false))}
        >
          <Check />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="cursor-pointer"
          aria-label="Cancel"
          disabled={set.isPending}
          onClick={() => setEditing(false)}
        >
          <X />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-40">
        <DateField value={date} onChange={setDate} max={max} />
      </div>
      <Button
        type="button"
        size="sm"
        className="cursor-pointer"
        disabled={set.isPending}
        onClick={() => save(date)}
      >
        Book
      </Button>
    </div>
  );
}
