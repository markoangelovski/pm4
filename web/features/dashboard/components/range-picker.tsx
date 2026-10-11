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
  isRangeTooLong,
  matchPreset,
  presetRange,
  PRESET_LABELS,
  RANGE_PRESETS,
  type DateRange,
  type RangePreset
} from "../range";

const iso = (d: Date) => format(d, "yyyy-MM-dd");

const OPTIONS: { value: RangePreset | "custom"; label: string }[] = [
  ...RANGE_PRESETS.map((p) => ({ value: p, label: PRESET_LABELS[p] })),
  { value: "custom", label: "Custom range" }
];

/** The range control (SCR-010): a preset select and a two-month range calendar in a popover. */
export function RangePicker({
  value,
  today,
  onChange
}: {
  value: DateRange;
  today: string;
  onChange: (range: DateRange) => void;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PickerRange | undefined>(undefined);
  const start = draft?.from ? iso(draft.from) : null;
  const end = draft?.from ? iso(draft.to ?? draft.from) : null;
  const tooLong =
    start !== null && end !== null && isRangeTooLong({ from: start, to: end });

  const openCalendar = (next: boolean) => {
    if (next) {
      setDraft({ from: parseISO(value.from), to: parseISO(value.to) });
    }
    setOpen(next);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        items={OPTIONS}
        value={matchPreset(value, today) ?? "custom"}
        onValueChange={(v) => {
          if (v === "custom") {
            openCalendar(true);
          } else if (v) {
            onChange(presetRange(v as RangePreset, today));
          }
        }}
      >
        <SelectTrigger
          aria-label="Time range"
          className="w-40 cursor-pointer rounded-md!"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((o) => (
            <SelectItem
              key={o.value}
              value={o.value}
              className="cursor-pointer"
            >
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Popover open={open} onOpenChange={openCalendar}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              aria-label="Pick dates"
              className="cursor-pointer justify-start rounded-md! font-normal"
            />
          }
        >
          <CalendarIcon data-icon="inline-start" />
          <span>{formatWorkDate(value.from)}</span> <span>–</span>{" "}
          <span>{formatWorkDate(value.to)}</span>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={draft}
            defaultMonth={parseISO(value.from)}
            onSelect={setDraft}
          />
          <div className="flex flex-wrap items-center gap-3 border-t p-3 text-sm">
            <span>{start ? formatWorkDate(start) : "Start date"}</span>
            <span aria-hidden>–</span>
            <span>{draft?.to ? formatWorkDate(iso(draft.to)) : "End date"}</span>
            {tooLong ? (
              <p className="text-muted-foreground">Pick at most 366 days.</p>
            ) : null}
            <Button
              type="button"
              size="sm"
              className="ml-auto cursor-pointer"
              disabled={!start || tooLong}
              onClick={() => {
                if (!start || !end) return;
                onChange({ from: start, to: end });
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
