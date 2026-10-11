"use client";

import { useMemo } from "react";
import { parseAsString, useQueryStates } from "nuqs";
import { CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/features/users/api";
import { today as todayIn } from "@/lib/time";
import { useBookingRange } from "../api";
import {
  bookingDays,
  defaultRange,
  parseRange,
  rangeLabel,
  type DateRange
} from "../days";
import { DaySection } from "./day-section";
import { RangeField } from "./range-field";

/** The Bookings page body (SCR-045): the range in the URL, then one section per listed day. */
export function BookingsView(): React.JSX.Element {
  const me = useMe();
  const timeZone = me.data?.timeZone ?? "UTC";
  const target = me.data?.dailyTargetMinutes ?? 0;
  const today = todayIn(timeZone);
  const [query, setQuery] = useQueryStates(
    { from: parseAsString, to: parseAsString },
    { history: "replace" }
  );
  const range = useMemo(
    () => parseRange(query.from, query.to, today),
    [query.from, query.to, today]
  );
  const bookings = useBookingRange(range.from, range.to);
  const data = bookings.data;
  const days = useMemo(
    () => (data ? bookingDays(data, range, target) : []),
    [data, range, target]
  );

  const submit = (next: DateRange) => {
    const def = defaultRange(today);
    void setQuery(
      next.from === def.from && next.to === def.to
        ? { from: null, to: null }
        : next
    );
  };

  const failed = me.isError || bookings.isError;
  const loading = !failed && (!me.data || !data);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
        <p className="text-sm text-muted-foreground">{rangeLabel(range)}</p>
      </div>
      <RangeField
        key={`${range.from}:${range.to}`}
        applied={range}
        max={today}
        onSubmit={submit}
      />
      {failed ? (
        <Card className="border rounded-md!">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Couldn&apos;t load the bookings.</EmptyTitle>
            </EmptyHeader>
            <EmptyContent>
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => {
                  if (me.isError) void me.refetch();
                  if (bookings.isError) void bookings.refetch();
                }}
              >
                Retry
              </Button>
            </EmptyContent>
          </Empty>
        </Card>
      ) : loading ? (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : days.length === 0 ? (
        <Card className="border rounded-md!">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarCheck />
              </EmptyMedia>
              <EmptyTitle>No logs in this range</EmptyTitle>
              <EmptyDescription>
                Pick another time range and submit.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      ) : (
        <div className="space-y-6">
          {days.map((day) => (
            <DaySection key={day.workDate} day={day} today={today} />
          ))}
        </div>
      )}
    </div>
  );
}
