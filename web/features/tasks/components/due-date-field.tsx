"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { formatWorkDate } from "@/lib/time";
import { cn } from "@/lib/utils";

/** SCR-032's due date: a calendar in a popover, the value as "3 Oct 2026", and a clear button. */
export function DueDateField({
  id,
  value,
  onChange,
  invalid
}: {
  id?: string;
  value: string | null;
  onChange: (date: string | null) => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseISO(value) : undefined;
  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              aria-invalid={invalid || undefined}
              className={cn(
                "flex-1 cursor-pointer justify-start rounded-md! font-normal",
                !value && "text-muted-foreground"
              )}
            />
          }
        >
          <CalendarIcon data-icon="inline-start" />
          {value ? formatWorkDate(value) : "No due date"}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            onSelect={(day) => {
              // The local calendar day, never toISOString().
              onChange(day ? format(day, "yyyy-MM-dd") : null);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Clear due date"
          onClick={() => onChange(null)}
          className="cursor-pointer"
        >
          <XIcon />
        </Button>
      ) : null}
    </div>
  );
}
