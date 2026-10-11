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

/** The range control (SCR-045): a two-month range calendar in a popover and Submit. */
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
  const [picked, setPicked] = useState<PickerRange | undefined>({
    from: parseISO(applied.from),
    to: parseISO(applied.to)
  });
  const start = picked?.from ? iso(picked.from) : null;
  const end = picked?.to ? iso(picked.to) : start;
  const tooLong = start !== null && end !== null && isRangeTooLong(start, end);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer justify-start rounded-md! font-normal"
            />
          }
        >
          <CalendarIcon data-icon="inline-start" />
          <span>{start ? formatWorkDate(start) : "Start date"}</span>{" "}
          <span>–</span>{" "}
          <span>{end ? formatWorkDate(end) : "End date"}</span>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={picked}
            defaultMonth={parseISO(applied.from)}
            disabled={{ after: parseISO(max) }}
            onSelect={setPicked}
          />
        </PopoverContent>
      </Popover>
      <Button
        type="button"
        className="cursor-pointer"
        disabled={!start || tooLong}
        onClick={() => {
          if (!start || !end) return;
          onSubmit({ from: start, to: end });
          setOpen(false);
        }}
      >
        Submit
      </Button>
      {tooLong ? (
        <p className="text-sm text-muted-foreground">Pick at most 366 days.</p>
      ) : null}
    </div>
  );
}
