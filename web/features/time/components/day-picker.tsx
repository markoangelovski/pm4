"use client";

import { useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { monthRange } from "@/lib/time";
import { useWorkdays } from "../api";

const ISO = "yyyy-MM-dd";

/** SCR-040: the full date, previous / next day, a calendar marking logged days, and Today. */
export function DayPicker({
  date,
  today,
  timeZone,
  onChange
}: {
  date: string;
  today: string;
  timeZone: string;
  onChange: (date: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => parseISO(date));
  const range = monthRange(format(month, ISO), timeZone);
  const workdays = useWorkdays(range.from, range.to);
  const logged = (workdays.data?.items ?? [])
    .filter((w) => w.totalMinutes > 0)
    .map((w) => parseISO(w.workDate));
  const current = parseISO(date);
  const isToday = date === today;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="mr-auto text-lg font-semibold tracking-tight">
        {format(current, "EEEE, d MMMM yyyy")}
      </h2>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous day"
          className="cursor-pointer"
          onClick={() => onChange(format(addDays(current, -1), ISO))}
        >
          <ChevronLeft />
        </Button>
        <Popover
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (o) setMonth(current);
          }}
        >
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                aria-label="Pick a date"
                className="cursor-pointer"
              />
            }
          >
            <CalendarIcon />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={current}
              month={month}
              onMonthChange={setMonth}
              disabled={{ after: parseISO(today) }}
              modifiers={{ logged }}
              modifiersClassNames={{
                logged:
                  "relative after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-primary"
              }}
              onSelect={(d) => {
                if (!d) return;
                onChange(format(d, ISO));
                setOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
        <Button
          variant="outline"
          size="icon"
          aria-label="Next day"
          disabled={isToday}
          className="cursor-pointer"
          onClick={() => onChange(format(addDays(current, 1), ISO))}
        >
          <ChevronRight />
        </Button>
        <Button
          variant="outline"
          disabled={isToday}
          className="cursor-pointer"
          onClick={() => onChange(today)}
        >
          Today
        </Button>
      </div>
    </div>
  );
}
