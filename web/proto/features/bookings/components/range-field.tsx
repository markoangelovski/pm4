"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { formatWorkDate } from "@/lib/time";

export interface DateRangeValue {
  from: string;
  to: string;
}

const iso = (d: Date) => format(d, "yyyy-MM-dd");

/** Start and end date in one calendar popover, plus a Submit button that applies the range. Days after `max` are disabled. */
export function RangeField({
  applied,
  max,
  onSubmit
}: {
  applied: DateRangeValue;
  max: string;
  onSubmit: (range: DateRangeValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>({
    from: parseISO(applied.from),
    to: parseISO(applied.to)
  });

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!draft?.from) return;
        onSubmit({ from: iso(draft.from), to: iso(draft.to ?? draft.from) });
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
      <Button type="submit" className="cursor-pointer" disabled={!draft?.from}>
        Submit
      </Button>
    </form>
  );
}
