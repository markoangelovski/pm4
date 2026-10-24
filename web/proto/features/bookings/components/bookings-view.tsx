"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore
} from "react";
import { parseAsString, useQueryStates } from "nuqs";
import { CalendarX } from "lucide-react";
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
import { useMe } from "@/proto/features/users/api";
import { today as todayIn } from "@/lib/time";
import { routes } from "@/proto/lib/routes";
import { cn } from "@/lib/utils";
import { useBookingRange, type BookingLog } from "../api";
import {
  bookingDays,
  dayAnchor,
  defaultRange,
  logsOfProject,
  monthUpTo,
  parseAnchor,
  parseRange,
  projectOptions,
  targetAnchor,
  rangeLabel,
  type DateRange
} from "../days";
import type { BookingLinks } from "./day-link";
import { DaySection } from "./day-section";
import { ProjectFilter } from "./project-filter";
import { RangeField } from "./range-field";

const subscribeHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener("popstate", onChange);
  };
};

/**
 * The URL's hash without `#`, for a page opened (or reloaded, or gone back to) with one. Not for clicks on this page:
 * a Link navigation or history.pushState fires no event, and Next writes the URL only after it renders the new query.
 */
function useHash(): string {
  return useSyncExternalStore(
    subscribeHash,
    () => window.location.hash.slice(1),
    () => ""
  );
}

/**
 * The Bookings page body (SCR-045): the range and the Project filter in the URL (default: this month up to today,
 * all projects), then one section per listed day (anchor `#day-YYYY-MM-DD`; a "Worked on" or "Booked to" link adds the booking's row), oldest first. A project filter lists and sums only that
 * project's logs; a project not among the range's projects counts as All projects.
 */
export function BookingsView() {
  const me = useMe();
  const timeZone = me.data?.timeZone ?? "UTC";
  const target = me.data?.dailyTargetMinutes ?? 0;
  const today = todayIn(timeZone);
  const [query, setQuery] = useQueryStates(
    { from: parseAsString, to: parseAsString, project: parseAsString },
    { history: "replace" }
  );
  const range = useMemo(
    () => parseRange(query.from, query.to, today),
    [query.from, query.to, today]
  );
  const bookings = useBookingRange(range.from, range.to);
  // While another range loads, the last loaded one stays on screen (dimmed): the page keeps its height, so a
  // "Worked on" / "Booked to" link to another month scrolls from where it was instead of jumping to the top and back.
  const [shown, setShown] = useState<{
    range: DateRange;
    data: BookingLog[];
  } | null>(null);
  if (bookings.data && (shown?.data !== bookings.data || shown.range !== range))
    setShown({ range, data: bookings.data });
  const data = shown?.data;
  const listed = shown?.range ?? range;
  const pending = shown !== null && shown.range !== range;
  const options = useMemo(
    () => (data ? projectOptions(data, listed) : []),
    [data, listed]
  );
  const project = options.some((o) => o.key === query.project)
    ? query.project
    : null;
  const days = useMemo(
    () =>
      data ? bookingDays(logsOfProject(data, project), listed, target) : [],
    [data, project, listed, target]
  );

  // The last "Worked on" / "Booked to" click: its anchor, and a count, so clicking the same link again scrolls and expands again.
  // It wins over the URL's hash until the URL changes some other way (typed, back / forward).
  const [jump, setJump] = useState<{ anchor: string; n: number } | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [holdHeight, setHoldHeight] = useState<number | null>(null);
  /** The focusKey whose outlines a click removed; a new link click makes a new key, outlined again. */
  const [dismissed, setDismissed] = useState<string | null>(null);
  useEffect(() => {
    const clear = () => setJump(null);
    window.addEventListener("hashchange", clear);
    window.addEventListener("popstate", clear);
    return () => {
      window.removeEventListener("hashchange", clear);
      window.removeEventListener("popstate", clear);
    };
  }, []);
  const links: BookingLinks = {
    href: (t) => {
      const anchor = targetAnchor(t);
      if (days.some((d) => d.workDate === t.day)) return `#${anchor}`;
      const params = new URLSearchParams({ ...monthUpTo(t.day, today) });
      if (project) params.set("project", project);
      return `${routes.app.bookings}?${params}#${anchor}`;
    },
    onJump: (t) => {
      // Another month replaces this one: hold the page's height until the scroll ends, else a shorter month clamps
      // the scroll position (a jump) before the animation starts.
      if (!days.some((d) => d.workDate === t.day))
        setHoldHeight(pageRef.current?.offsetHeight ?? null);
      setJump((j) => ({ anchor: targetAnchor(t), n: (j?.n ?? 0) + 1 }));
    }
  };

  // The hash's day (and booking row) render after the data loads: scroll to them then, smoothly, once per hash and
  // click, so a refetch after an edit doesn't scroll back.
  const urlHash = useHash();
  const hash = jump?.anchor ?? urlHash;
  const focus = parseAnchor(hash);
  const focusKey = `${hash}#${jump?.n ?? 0}`;
  const scrolledTo = useRef<string | null>(null);
  useEffect(() => {
    const anchor = parseAnchor(hash);
    if (!anchor || focusKey === scrolledTo.current) return;
    const day = document.getElementById(dayAnchor(anchor.day));
    const row = anchor.row
      ? day?.querySelector(`[data-booking="${anchor.row}"]`)
      : null;
    const target = row ?? day;
    if (!target) return;
    scrolledTo.current = focusKey;
    target.scrollIntoView({
      behavior: "smooth",
      block: row ? "center" : "start"
    });
    // Release the held height once the scroll has stopped (10 frames without moving). Not scrollend or a timer: a
    // stray scrollend or an earlier click's timer released it mid-scroll. Not undone in a cleanup: a refetch
    // mid-scroll re-runs this effect, and the hold must still be released.
    let last = -1;
    let still = 0;
    const watch = () => {
      still = window.scrollY === last ? still + 1 : 0;
      last = window.scrollY;
      if (still < 10) {
        requestAnimationFrame(watch);
        return;
      }
      setHoldHeight(null);
      // Arrived: the next click anywhere removes the outlines (the day stays expanded).
      window.addEventListener("pointerdown", () => setDismissed(focusKey), {
        once: true,
        capture: true
      });
    };
    requestAnimationFrame(watch);
  }, [days, hash, focusKey]);

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
    <div
      ref={pageRef}
      className="space-y-6"
      style={holdHeight ? { minHeight: holdHeight } : undefined}
    >
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
          <p className="text-sm text-muted-foreground">{rangeLabel(range)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RangeField
            key={`${range.from}:${range.to}`}
            applied={range}
            max={today}
            onSubmit={submit}
          />
          <ProjectFilter
            options={options}
            value={project}
            disabled={!data}
            onChange={(key) => void setQuery({ project: key })}
          />
        </div>
      </div>
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
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : days.length === 0 ? (
        <Card className="border rounded-md!">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarX />
              </EmptyMedia>
              <EmptyTitle>No logs in this range</EmptyTitle>
              <EmptyDescription>
                Pick another time range or project.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      ) : (
        <div
          aria-busy={pending || undefined}
          className={cn(
            "space-y-6 transition-opacity",
            pending && "opacity-60"
          )}
        >
          {days.map((d) => (
            <DaySection
              key={d.workDate}
              day={d}
              isToday={d.workDate === today}
              today={today}
              links={links}
              focus={
                focus?.day === d.workDate
                  ? {
                      key: focusKey,
                      row: focus.row,
                      outlined: focusKey !== dismissed
                    }
                  : null
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
