"use client";

import { Fragment, useState } from "react";
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { parseAsString, useQueryState } from "nuqs";
import {
  CalendarCheck,
  CalendarIcon,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  Clock,
  FolderKanban,
  ListTodo,
  RefreshCw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@/components/ui/empty";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle
} from "@/components/ui/item";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { useMe } from "@/proto/features/users/api";
import { formatDuration, today } from "@/lib/time";
import { formatClock } from "@/lib/time/clock";
import { cn } from "@/lib/utils";
import { usePmspaDays } from "../api";
import { pmspaProblemText } from "../sync";
import { ExpandAllButton } from "./expand-all-button";
import type { PmspaDayDto, PmspaDayLinkState, PmspaEventDto } from "../types";

const DATE = "yyyy-MM-dd";
const monday = (date: string) =>
  format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), DATE);

const LINK_STATE: Record<PmspaDayLinkState, { label: string; dot: string }> = {
  linked: { label: "Linked", dot: "bg-emerald-500" },
  "partly-linked": { label: "Partly linked", dot: "bg-amber-500" },
  "not-linked": { label: "Not linked", dot: "bg-muted-foreground/50" }
};

/** "13 – 19 Oct 2026", or "29 Sep – 5 Oct 2026" across months. */
function weekLabel(from: string, to: string): string {
  const a = parseISO(from);
  const b = parseISO(to);
  const sameMonth = format(a, "MMM yyyy") === format(b, "MMM yyyy");
  return `${format(a, sameMonth ? "d" : "d MMM")} – ${format(b, "d MMM yyyy")}`;
}

/** FR-INT-011: PMSPA days of a week with their events; a day imports with all its events. */
export function PmspaTimeTab({
  selection,
  onSelectionChange
}: {
  selection: Set<string>;
  onSelectionChange: (next: Set<string>) => void;
}) {
  const { data: me } = useMe();
  const now = me ? today(me.timeZone) : null;
  const [weekParam, setWeek] = useQueryState(
    "week",
    parseAsString.withOptions({ history: "replace" })
  );
  const week = monday(weekParam ?? now ?? format(new Date(), DATE));
  const to = format(addDays(parseISO(week), 6), DATE);
  const query = usePmspaDays(week, to, me !== undefined);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [picking, setPicking] = useState(false);
  const days = query.data ?? [];

  const allOpen = days.length > 0 && days.every((d) => open.has(d.date));

  const toggle = (set: Set<string>, value: string) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };
  const allSelected =
    days.length > 0 && days.every((d) => selection.has(d.date));
  const isThisWeek = now !== null && monday(now) === week;
  const goTo = (date: string) =>
    void setWeek(now && monday(date) === monday(now) ? null : monday(date));

  let content: React.ReactNode;
  if (query.isError) {
    content = (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Couldn&apos;t read your PMSPA days.</EmptyTitle>
          <EmptyDescription>
            {pmspaProblemText(query.error) ?? "PMSPA may be unreachable."}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => void query.refetch()}
          >
            Retry
          </Button>
        </EmptyContent>
      </Empty>
    );
  } else if (!query.isPending && days.length === 0) {
    content = (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarX />
          </EmptyMedia>
          <EmptyTitle>No time in PMSPA this week</EmptyTitle>
          <EmptyDescription>
            Pick another week to find days to import.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  } else {
    content = (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 pl-4">
                <Checkbox
                  aria-label="Select every day of the week"
                  className="cursor-pointer"
                  disabled={days.length === 0}
                  checked={allSelected}
                  indeterminate={
                    !allSelected && days.some((d) => selection.has(d.date))
                  }
                  onCheckedChange={() => {
                    const next = new Set(selection);
                    for (const d of days) {
                      if (allSelected) next.delete(d.date);
                      else next.add(d.date);
                    }
                    onSelectionChange(next);
                  }}
                />
              </TableHead>
              <TableHead>Day</TableHead>
              <TableHead className="w-24">Start</TableHead>
              <TableHead className="w-28 text-right!">Logged</TableHead>
              <TableHead className="w-44 pr-4">In PM4</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isPending
              ? Array.from({ length: 4 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-4">
                      <Skeleton className="size-4" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-48" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="ml-auto h-4 w-14" />
                    </TableCell>
                    <TableCell className="pr-4">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  </TableRow>
                ))
              : days.map((d) => (
                  <DayRows
                    key={d.date}
                    day={d}
                    open={open.has(d.date)}
                    onToggleOpen={() => setOpen((o) => toggle(o, d.date))}
                    selected={selection.has(d.date)}
                    onToggle={() =>
                      onSelectionChange(toggle(selection, d.date))
                    }
                  />
                ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <Card className="gap-0 p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <h2 className="text-sm font-semibold">{weekLabel(week, to)}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <ButtonGroup aria-label="Week">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous week"
              className="cursor-pointer"
              onClick={() => goTo(format(addDays(parseISO(week), -7), DATE))}
            >
              <ChevronLeft />
            </Button>
            <Popover open={picking} onOpenChange={setPicking}>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Pick a week"
                    className="cursor-pointer"
                  />
                }
              >
                <CalendarIcon />
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-0">
                <Calendar
                  mode="single"
                  weekStartsOn={1}
                  selected={parseISO(week)}
                  defaultMonth={parseISO(week)}
                  disabled={now ? { after: parseISO(now) } : undefined}
                  modifiers={{
                    inWeek: { from: parseISO(week), to: parseISO(to) }
                  }}
                  modifiersClassNames={{ inWeek: "bg-accent rounded-none" }}
                  onSelect={(d) => {
                    if (!d) return;
                    goTo(format(d, DATE));
                    setPicking(false);
                  }}
                />
              </PopoverContent>
            </Popover>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next week"
              className="cursor-pointer"
              disabled={isThisWeek}
              onClick={() => goTo(format(addDays(parseISO(week), 7), DATE))}
            >
              <ChevronRight />
            </Button>
          </ButtonGroup>
          <Button
            variant="outline"
            className="cursor-pointer"
            disabled={isThisWeek}
            onClick={() => void setWeek(null)}
          >
            This week
          </Button>
          <ExpandAllButton
            expanded={allOpen}
            disabled={query.isPending || days.length === 0}
            onExpandedChange={(expand) =>
              setOpen(expand ? new Set(days.map((d) => d.date)) : new Set())
            }
          />
        </div>
      </div>
      {content}
    </Card>
  );
}

function DayRows({
  day,
  open,
  onToggleOpen,
  selected,
  onToggle
}: {
  day: PmspaDayDto;
  open: boolean;
  onToggleOpen: () => void;
  selected: boolean;
  onToggle: () => void;
}) {
  const state = LINK_STATE[day.linkState];
  return (
    <Fragment>
      <TableRow
        data-state={selected ? "selected" : undefined}
        className="cursor-pointer"
        onClick={onToggleOpen}
      >
        <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            aria-label={`Select ${format(parseISO(day.date), "d MMM yyyy")}`}
            className="cursor-pointer"
            checked={selected}
            onCheckedChange={onToggle}
          />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5">
            <ChevronRight
              aria-hidden
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-90"
              )}
            />
            <span className="font-medium">
              {format(parseISO(day.date), "EEE, d MMM yyyy")}
            </span>
            <span className="text-xs text-muted-foreground">
              {day.events.length} {day.events.length === 1 ? "event" : "events"}
            </span>
          </div>
        </TableCell>
        <TableCell className="tabular-nums">
          {day.startMinute === null ? "—" : formatClock(day.startMinute)}
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {formatDuration(day.totalMinutes)}
        </TableCell>
        <TableCell className="pr-4">
          <Badge variant="outline" className="gap-1.5 font-normal">
            <span
              aria-hidden
              className={cn("size-2 rounded-full", state.dot)}
            />
            {state.label}
          </Badge>
        </TableCell>
      </TableRow>
      {open ? (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell />
          <TableCell colSpan={4} className="py-3 pr-4 whitespace-normal">
            <ItemGroup className="gap-2">
              {day.events.map((e) => (
                <EventItem key={e.id} event={e} />
              ))}
            </ItemGroup>
          </TableCell>
        </TableRow>
      ) : null}
    </Fragment>
  );
}

/** One PMSPA event: its title, "<project> › <task>" (or "imports as Unsorted"), booked flag and logs. */
function EventItem({ event: e }: { event: PmspaEventDto }) {
  const minutes = e.logs.reduce((t, l) => t + l.durationMinutes, 0);
  return (
    <Item
      variant="outline"
      size="sm"
      role="listitem"
      className="items-start rounded-md! bg-background"
    >
      <ItemMedia variant="icon" className="text-muted-foreground">
        <Clock />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle className="flex-wrap">
          {e.title}
          {e.booked ? (
            <Badge variant="outline" className="font-normal">
              <CalendarCheck /> Booked in PMSPA
            </Badge>
          ) : null}
        </ItemTitle>
        <ItemDescription className="flex flex-wrap items-center gap-x-1.5">
          {e.task ? (
            <>
              <span className="flex items-center gap-1.5">
                <FolderKanban className="size-3.5 shrink-0" />
                {e.task.projectTitle}
              </span>
              <span aria-hidden>›</span>
              <span className="flex items-center gap-1.5">
                <ListTodo className="size-3.5 shrink-0" />
                {e.task.title}
              </span>
            </>
          ) : (
            "No task: imports as Unsorted"
          )}
        </ItemDescription>
        <ul className="mt-1 flex flex-col divide-y">
          {e.logs.map((l) => (
            <li
              key={l.id}
              className="flex items-start gap-3 py-1.5 text-sm text-muted-foreground"
            >
              <span className="min-w-0 flex-1 text-foreground">{l.title}</span>
              {l.linked ? (
                <Badge variant="outline" className="font-normal">
                  <RefreshCw /> Linked
                </Badge>
              ) : null}
              <span className="w-14 shrink-0 text-right tabular-nums">
                {formatDuration(l.durationMinutes)}
              </span>
            </li>
          ))}
        </ul>
      </ItemContent>
      <span className="shrink-0 text-sm font-medium tabular-nums">
        {formatDuration(minutes)}
      </span>
    </Item>
  );
}
