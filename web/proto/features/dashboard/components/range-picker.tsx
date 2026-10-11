"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import type { DateRange as DayPickerRange } from "react-day-picker";
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
  matchPreset,
  presetRange,
  type DateRange,
  type RangePreset
} from "../range";

const iso = (d: Date) => format(d, "yyyy-MM-dd");
const CUSTOM = "custom";
const ITEMS = [
  ...RANGE_PRESETS.map((p) => ({
    value: p as string,
    label: PRESET_LABELS[p]
  })),
  { value: CUSTOM, label: "Custom range" }
];

/** A preset select (This month by default) and the range as a calendar popover; the calendar applies a custom range. */
export function RangePicker({
  value,
  today,
  timeZone,
  onChange
}: {
  value: DateRange;
  today: string;
  timeZone: string;
  onChange: (range: DateRange) => void;
}) {
  const preset = matchPreset(value, today, timeZone);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DayPickerRange | undefined>();

  const openCalendar = (o: boolean) => {
    if (o) setDraft({ from: parseISO(value.from), to: parseISO(value.to) });
    setOpen(o);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        items={ITEMS}
        value={preset ?? CUSTOM}
        onValueChange={(v) => {
          if (v === CUSTOM) openCalendar(true);
          else if (v) onChange(presetRange(v as RangePreset, today, timeZone));
        }}
      >
        <SelectTrigger aria-label="Time range" className="w-40 cursor-pointer">
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
      <Popover open={open} onOpenChange={openCalendar}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              aria-label="Pick dates"
              className="cursor-pointer justify-start font-normal"
            />
          }
        >
          <CalendarIcon data-icon="inline-start" />
          {formatWorkDate(value.from)}
          <span className="text-muted-foreground">–</span>
          {formatWorkDate(value.to)}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <Calendar
            mode="range"
            resetOnSelect
            numberOfMonths={2}
            selected={draft}
            defaultMonth={draft?.from}
            onSelect={setDraft}
          />
          <div className="flex items-center justify-between gap-2 border-t p-3">
            <span className="text-sm text-muted-foreground">
              {draft?.from ? formatWorkDate(iso(draft.from)) : "Start date"} –{" "}
              {draft?.to ? formatWorkDate(iso(draft.to)) : "End date"}
            </span>
            <Button
              size="sm"
              className="cursor-pointer"
              disabled={!draft?.from}
              onClick={() => {
                if (!draft?.from) return;
                onChange({
                  from: iso(draft.from),
                  to: iso(draft.to ?? draft.from)
                });
                setOpen(false);
              }}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
