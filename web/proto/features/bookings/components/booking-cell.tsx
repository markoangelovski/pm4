"use client";

import { useState } from "react";
import { BookmarkCheck, Check, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateField } from "@/proto/features/time/components/date-field";
import { useBookingActions } from "@/proto/mock/hooks";
import { formatWorkDate } from "@/lib/time";
import { cn } from "@/lib/utils";

/** Dark green when a log is booked to the day it was worked, dark yellow when booked to another day. */
export const bookedTone = (sameDay: boolean) =>
  sameDay
    ? "text-green-700 dark:text-green-400"
    : "text-yellow-700 dark:text-yellow-500";

/** A log's booking: pick a date and Book it, or (once booked) edit the date or remove the booking. */
export function BookingCell({
  logId,
  workDate,
  bookingDate,
  max
}: {
  logId: string;
  workDate: string;
  bookingDate: string | null;
  max: string;
}) {
  const { book, unbook } = useBookingActions();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(bookingDate ?? workDate);

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
            onClick={() => unbook(logId)}
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
            onClick={() => {
              book(logId, draft);
              setEditing(false);
            }}
          >
            <Check />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="cursor-pointer"
            aria-label="Cancel"
            onClick={() => setEditing(false)}
          >
            <X />
          </Button>
        </>
      ) : (
        <Button
          className="cursor-pointer rounded-md!"
          onClick={() => book(logId, draft)}
        >
          Book
        </Button>
      )}
    </div>
  );
}
