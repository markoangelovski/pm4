"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import type { DateRange as PickerRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { formatWorkDate } from "@/lib/time";
import { isRangeTooLong, type DateRange } from "../days";

const iso = (d: Date) => format(d, "yyyy-MM-dd");

/** The range control (SCR-045): start and end in one two-month calendar popover, and Submit, which applies the range. Days after `max` are disabled; at most 366 days (OQ-130). */
export function RangeField({
  applied,
  max,
  onSubmit
}: {
  applied: DateRange;
  max: string;
  onSubmit: (range: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PickerRange | undefined>({
    from: parseISO(applied.from),
    to: parseISO(applied.to)
  });
  const start = draft?.from ? iso(draft.from) : null;
  const end = draft?.to ? iso(draft.to) : start;
  const tooLong = start !== null && end !== null && isRangeTooLong(start, end);

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!start || !end || tooLong) return;
        setOpen(false);
        onSubmit({ from: start, to: end });
      }}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              aria-label="Time range"
              className="cursor-pointer justify-start rounded-md! font-normal"
            />
          }
        >
          <CalendarIcon data-icon="inline-start" />
          {draft?.from ? formatWorkDate(iso(draft.from)) : "Start date"}
          <span className="text-muted-foreground">–</span>
          {draft?.to ? formatWorkDate(iso(draft.to)) : "End date"}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={draft}
            defaultMonth={draft?.from}
            disabled={{ after: parseISO(max) }}
            onSelect={setDraft}
          />
        </PopoverContent>
      </Popover>
      <Button
        type="submit"
        className="cursor-pointer"
        disabled={!start || tooLong}
      >
        Submit
      </Button>
      {tooLong ? (
        <p className="text-sm text-muted-foreground">Pick at most 366 days.</p>
      ) : null}
    </form>
  );
}
