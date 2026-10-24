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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { formatWorkDate } from "@/lib/time";
import {
  PRESET_LABELS,
  RANGE_PRESETS,
  type RangePreset
} from "@/proto/features/dashboard/range";
import {
  bookingPresetRange,
  isRangeTooLong,
  matchBookingPreset,
  type DateRange
} from "../days";

const iso = (d: Date) => format(d, "yyyy-MM-dd");
const CUSTOM = "custom";
const ITEMS = [
  ...RANGE_PRESETS.map((p) => ({
    value: p as string,
    label: PRESET_LABELS[p]
  })),
  { value: CUSTOM, label: "Custom range" }
];

/**
 * The range control (SCR-045): a preset select (the Statistics presets, ends clipped to `max`) that applies at once,
 * then start and end in one two-month calendar popover, and Submit, which applies the range. Custom range opens the
 * calendar. Days after `max` (today) are disabled; at most 366 days (OQ-130).
 */
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
  const preset = matchBookingPreset(applied, max);

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
      <Select
        items={ITEMS}
        value={preset ?? CUSTOM}
        onValueChange={(v) => {
          if (v === CUSTOM) setOpen(true);
          else if (v) onSubmit(bookingPresetRange(v as RangePreset, max));
        }}
      >
        <SelectTrigger
          aria-label="Range preset"
          className="w-40 cursor-pointer rounded-md!"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ITEMS.map((i) => (
            <SelectItem
              key={i.value}
              value={i.value}
              className="cursor-pointer"
            >
              {i.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
