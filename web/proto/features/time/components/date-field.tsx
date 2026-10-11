"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { formatWorkDate } from "@/lib/time";
import { cn } from "@/lib/utils";

/** A calendar in a popover; days after `max` (YYYY-MM-DD) are disabled. */
export function DateField({
  id,
  value,
  onChange,
  max,
  invalid
}: {
  id?: string;
  value: string;
  onChange: (date: string) => void;
  max: string;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseISO(value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-invalid={invalid || undefined}
            className={cn(
              "w-full cursor-pointer justify-start rounded-md! font-normal"
            )}
          />
        }
      >
        <CalendarIcon data-icon="inline-start" />
        {formatWorkDate(value)}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          disabled={{ after: parseISO(max) }}
          onSelect={(day) => {
            if (!day) return;
            onChange(format(day, "yyyy-MM-dd"));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
