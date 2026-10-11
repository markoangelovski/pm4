"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarX } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@/components/ui/empty";
import { monthRange, today as todayIn, formatWorkDate } from "@/lib/time";
import {
  useAllLogs,
  useBookings,
  useLogsInRange,
  useMeSettings
} from "@/proto/mock/hooks";
import { daysWithLogs } from "../month";
import { DaySection } from "./day-section";
import { RangeField, type DateRangeValue } from "./range-field";

const label = ({ from, to }: DateRangeValue) =>
  from.slice(0, 7) === to.slice(0, 7)
    ? format(parseISO(from), "MMMM yyyy")
    : `${formatWorkDate(from)} – ${formatWorkDate(to)}`;

/** Prototype: the days with logs in the submitted time range (the current month so far by default), oldest first. */
export function BookingsView() {
  const { timeZone, dailyTargetMinutes } = useMeSettings();
  const today = todayIn(timeZone);
  const [range, setRange] = useState<DateRangeValue>(() => ({
    from: monthRange(today, timeZone).from,
    to: today
  }));
  const logs = useLogsInRange(range.from, range.to);
  const allLogs = useAllLogs();
  const bookings = useBookings();
  const days = useMemo(
    () => daysWithLogs(logs, allLogs, range, dailyTargetMinutes, bookings),
    [logs, allLogs, range, dailyTargetMinutes, bookings]
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
          <p className="text-sm text-muted-foreground">{label(range)}</p>
        </div>
        <RangeField applied={range} max={today} onSubmit={setRange} />
      </div>
      {days.length === 0 ? (
        <Card className="border rounded-md!">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarX />
              </EmptyMedia>
              <EmptyTitle>No logs in this range</EmptyTitle>
              <EmptyDescription>
                Pick another time range and submit.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      ) : (
        days.map((d) => (
          <DaySection
            key={d.workDate}
            day={d}
            isToday={d.workDate === today}
            today={today}
          />
        ))
      )}
    </div>
  );
}
