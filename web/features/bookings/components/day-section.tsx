"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Bookmark, ChevronRight, ListTodo } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { ProjectIcon } from "@/features/projects/components/project-icon";
import type { Ref } from "@/features/time/types";
import { routes } from "@/lib/routes";
import { formatDuration, formatWorkDate } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useSetBooking } from "../api";
import type { BookingDay, BookingEntry, BookingGroup } from "../days";
import { BookingCell, bookedTone } from "./booking-cell";

const hours = (minutes: number) =>
  minutes === 0 ? "0h" : formatDuration(minutes);

const FIGURES: {
  key: "logged" | "billable" | "overtime" | "bookedCurrent" | "bookedExternal" | "bookedTotal";
  label: string;
  hint?: string;
}[] = [
  { key: "logged", label: "Logged" },
  { key: "billable", label: "Billable" },
  { key: "overtime", label: "Overtime" },
  {
    key: "bookedCurrent",
    label: "Booked current",
    hint: "Hours of this day's own logs that are booked to this day."
  },
  {
    key: "bookedExternal",
    label: "Booked from external",
    hint: "Hours of logs worked on other days that are booked to this day."
  },
  {
    key: "bookedTotal",
    label: "Booked total",
    hint: "Booked current plus Booked from external: all hours booked to this day."
  }
];

function RefName({
  item,
  href,
  icon
}: {
  item: Ref;
  href: string;
  icon?: React.ReactNode;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      {icon}
      {item.deleted || !item.id ? (
        <>
          <span className="truncate">{item.title}</span>
          <span className="text-muted-foreground">(deleted)</span>
        </>
      ) : (
        <Link
          href={`${href}?id=${item.id}`}
          className="truncate hover:underline"
        >
          {item.title}
        </Link>
      )}
    </span>
  );
}

function GroupName({ group }: { group: BookingGroup }) {
  if (group.kind === "unsorted") return <span>Unsorted</span>;
  if (group.kind === "nonprod") return <span>Non-prod</span>;
  const project = group.project!;
  return (
    <RefName
      item={project}
      href={routes.app.project}
      icon={
        project.id ? (
          <ProjectIcon project={{ id: project.id }} className="size-5 rounded-md" />
        ) : null
      }
    />
  );
}

function LogRow({
  entry,
  kind,
  today
}: {
  entry: BookingEntry;
  kind: BookingGroup["kind"];
  today: string;
}) {
  const { log } = entry;
  let booking: React.ReactNode = null;
  if (entry.incoming) {
    booking = (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 whitespace-nowrap",
          bookedTone(false)
        )}
        title="Edit this booking from the day the log was worked"
      >
        <Bookmark className="size-4" />
        Worked on {formatWorkDate(log.workDate)}
      </span>
    );
  } else if (kind === "unsorted") {
    booking = (
      <span className="text-muted-foreground">
        Add the log to a Project or Task
      </span>
    );
  } else if (kind === "project") {
    booking = <BookingCell log={log} max={today} />;
  }
  return (
    <TableRow className="bg-muted/30">
      <TableCell />
      <TableCell>
        {log.task ? (
          <RefName
            item={log.task}
            href={routes.app.task}
            icon={<ListTodo className="size-4 shrink-0 text-muted-foreground" />}
          />
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="max-w-64">
        <span className="block truncate" title={log.text}>
          {log.text}
        </span>
      </TableCell>
      <TableCell>{booking}</TableCell>
      <TableCell className="tabular-nums">{hours(entry.worked)}</TableCell>
      <TableCell className="tabular-nums">{hours(entry.booked)}</TableCell>
    </TableRow>
  );
}

/** One date (SCR-045): the heading, the six figures and the table of groups. */
export function DaySection({
  day,
  today
}: {
  day: BookingDay;
  today: string;
}) {
  const [open, setOpen] = useState<string[]>([]);
  const set = useSetBooking();
  const expandedLayout = open.length > 0;
  const toggle = (key: string) =>
    setOpen((o) => (o.includes(key) ? o.filter((k) => k !== key) : [...o, key]));
  const bookAll = (group: BookingGroup) =>
    set.mutate(
      { logIds: group.unbookedIds, bookingDate: day.workDate },
      { onError: () => toast.error("Couldn't save the booking.") }
    );

  return (
    <section aria-label={day.workDate} className="space-y-3">
      <div className="flex items-center gap-2 rounded-md bg-muted px-4 py-2">
        <h2 className="text-base font-semibold">
          {format(parseISO(day.workDate), "EEEE, d MMMM yyyy")}
        </h2>
        {day.workDate === today ? (
          <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
            Today
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {FIGURES.map((f) => (
          <Card key={f.key} className="gap-1 border rounded-md! px-4 py-3">
            <div className="text-xs text-muted-foreground">
              {f.hint ? (
                <Tooltip>
                  <TooltipTrigger
                    className="cursor-help underline decoration-dotted underline-offset-4"
                  >
                    {f.label}
                  </TooltipTrigger>
                  <TooltipContent>{f.hint}</TooltipContent>
                </Tooltip>
              ) : (
                f.label
              )}
            </div>
            <div className="text-lg font-semibold tabular-nums">
              {hours(day[f.key])}
            </div>
          </Card>
        ))}
      </div>
      <Card className="border rounded-md! py-0">
        <Table>
          <TableHeader>
            <TableRow>
              {expandedLayout ? (
                <>
                  <TableHead>Project</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Logs</TableHead>
                  <TableHead>Booking date</TableHead>
                </>
              ) : (
                <TableHead>Projects</TableHead>
              )}
              <TableHead>Hours worked</TableHead>
              <TableHead>Hours booked</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {day.groups.map((group) => {
              const isOpen = open.includes(group.key);
              const showBookAll =
                group.kind === "project" && group.unbookedIds.length > 0;
              const bookAllButton = showBookAll ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="cursor-pointer"
                  disabled={set.isPending}
                  onClick={() => bookAll(group)}
                >
                  Book all
                </Button>
              ) : null;
              return (
                <Fragment key={group.key}>
                  <TableRow
                    className="cursor-pointer"
                    onClick={(e) => {
                      if (
                        (e.target as HTMLElement).closest(
                          "a, button, input, [role=dialog]"
                        )
                      )
                        return;
                      toggle(group.key);
                    }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="cursor-pointer"
                          aria-label={
                            isOpen ? "Collapse project" : "Expand project"
                          }
                          aria-expanded={isOpen}
                          onClick={() => toggle(group.key)}
                        >
                          <ChevronRight
                            className={cn(
                              "transition-transform",
                              isOpen && "rotate-90"
                            )}
                          />
                        </Button>
                        <GroupName group={group} />
                        {!expandedLayout ? bookAllButton : null}
                      </div>
                    </TableCell>
                    {expandedLayout ? (
                      <>
                        <TableCell />
                        <TableCell />
                        <TableCell>{bookAllButton}</TableCell>
                      </>
                    ) : null}
                    <TableCell className="tabular-nums">
                      {hours(group.worked)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {hours(group.booked)}
                    </TableCell>
                  </TableRow>
                  {isOpen
                    ? group.entries.map((entry) => (
                        <LogRow
                          key={entry.log.id}
                          entry={entry}
                          kind={group.kind}
                          today={today}
                        />
                      ))
                    : null}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </section>
  );
}
