"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  type ColumnDef,
  type ExpandedState,
  type Row
} from "@tanstack/react-table";
import { BookmarkCheck, ChevronRight, ListTodo } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { ProjectIcon } from "@/features/projects/components/project-icon";
import { DeletedName } from "@/features/time/components/deleted-marker";
import { formatDuration, formatWorkDate } from "@/lib/time";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useSetBooking } from "../api";
import {
  addBooking,
  unbookedMinutes,
  type BookingDay,
  type BookingEntry,
  type BookingGroup
} from "../days";
import {
  BookingDateCell,
  BookingDraftsProvider,
  BookingTimeCell,
  bookedTone
} from "./booking-cell";

/** A table row: one group of the day (a project, Unsorted or Non-prod) with its log rows as `subRows`, or one log row. */
interface BookingRow {
  id: string;
  group: BookingGroup;
  entry?: BookingEntry;
  subRows?: BookingRow[];
}

const rowsOf = (day: BookingDay): BookingRow[] =>
  day.groups.map((group) => ({
    id: `${day.workDate}:${group.key}`,
    group,
    subRows: group.entries.map((entry) => ({
      id: entry.incoming
        ? `${day.workDate}:in:${entry.log.id}`
        : `${entry.log.id}:${entry.booking?.date ?? "rest"}`,
      group,
      entry
    }))
  }));

const hours = (minutes: number) =>
  minutes === 0 ? "0h" : formatDuration(minutes);

function Stat({
  label,
  value,
  hint
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="border rounded-md! bg-primary/5 ring-primary/20">
      <CardContent className="flex flex-col gap-1 py-0">
        {hint ? (
          <Tooltip>
            <TooltipTrigger
              render={<p tabIndex={0} />}
              className="w-fit cursor-help text-sm text-muted-foreground underline decoration-dotted underline-offset-4"
            >
              {label}
            </TooltipTrigger>
            <TooltipContent>{hint}</TooltipContent>
          </Tooltip>
        ) : (
          <p className="text-sm text-muted-foreground">{label}</p>
        )}
        <p className="text-2xl font-semibold tabular-nums tracking-tight">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

/** A log's task: the task icon and an underlined link (deleted tasks are plain text). Only on the log's first row. */
function LogTask({ row }: { row: BookingRow }) {
  if (!row.entry?.first) return null;
  const task = row.entry.log.task;
  if (!task) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex items-center gap-1.5">
      <ListTodo className="size-4 shrink-0 text-muted-foreground" />
      {task.id && !task.deleted ? (
        <Link
          href={`${routes.app.task}?id=${task.id}`}
          className="truncate font-medium underline underline-offset-2 hover:text-primary"
        >
          {task.title}
        </Link>
      ) : (
        <DeletedName title={task.title} />
      )}
    </span>
  );
}

/** Books the unbooked time of each of the project's logs of the day to that day (FR-BOOK-005). Null when there is nothing to book. */
function BookAllButton({
  group,
  workDate
}: {
  group: BookingGroup;
  workDate: string;
}) {
  const set = useSetBooking();
  if (group.kind !== "project" || !group.unbooked.length) return null;
  return (
    <Button
      className="shrink-0 cursor-pointer rounded-md!"
      disabled={set.isPending}
      onClick={() =>
        set.mutate(
          {
            logs: group.unbooked.map((log) => ({
              logId: log.id,
              bookings: addBooking(log.bookings, workDate, unbookedMinutes(log))
            }))
          },
          { onError: () => toast.error("Couldn't save the booking.") }
        )
      }
    >
      Book all
    </Button>
  );
}

const GROUP_TITLES = { unsorted: "Unsorted", nonprod: "Non-prod" } as const;

/** The group's name: a live project links to its page; a deleted one is plain text with the deleted marker; Unsorted and Non-prod have no icon. */
function GroupName({ group }: { group: BookingGroup }) {
  if (group.kind !== "project")
    return (
      <span className="truncate font-medium">{GROUP_TITLES[group.kind]}</span>
    );
  const project = group.project!;
  if (!project.id || project.deleted)
    return <DeletedName title={project.title} className="font-medium" />;
  return (
    <>
      <ProjectIcon
        project={{ id: project.id }}
        className="size-5 shrink-0 rounded-md"
      />
      <Link
        href={`${routes.app.project}?id=${project.id}`}
        className="truncate font-medium underline underline-offset-2 hover:text-primary"
      >
        {project.title}
      </Link>
    </>
  );
}

function ProjectCell({ row }: { row: Row<BookingRow> }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-expanded={row.getIsExpanded()}
        aria-label={row.getIsExpanded() ? "Collapse project" : "Expand project"}
        onClick={row.getToggleExpandedHandler()}
        className="cursor-pointer hover:text-primary"
      >
        <ChevronRight
          className={cn(
            "size-4 shrink-0 transition-transform",
            row.getIsExpanded() && "rotate-90"
          )}
        />
      </button>
      <GroupName group={row.original.group} />
    </div>
  );
}

/**
 * Seven fixed columns, so widths never change. A collapsed project row spans Project + Tasks + Logs and keeps its
 * Booking date cell, so Book all stays in the same place whether the row is expanded or not.
 */
const columns: ColumnDef<BookingRow>[] = [
  {
    id: "project",
    header: "Project",
    cell: ({ row }) => (row.depth === 0 ? <ProjectCell row={row} /> : null)
  },
  {
    id: "tasks",
    header: "Tasks",
    cell: ({ row }) => (row.depth === 0 ? null : <LogTask row={row.original} />)
  },
  {
    id: "logs",
    header: "Logs",
    cell: ({ row }) =>
      row.original.entry?.first ? (
        <p className="truncate text-sm" title={row.original.entry.log.text}>
          {row.original.entry.log.text}
        </p>
      ) : null
  },
  {
    id: "booking",
    header: "Booking date",
    cell: ({ row, table }) => {
      const { group, entry } = row.original;
      const { today, workDate } = table.options.meta as {
        today: string;
        workDate: string;
      };
      if (!entry) return <BookAllButton group={group} workDate={workDate} />;
      if (group.kind === "nonprod") return null;
      if (group.kind === "unsorted")
        return (
          <span className="text-sm text-muted-foreground">
            Add the log to a Project or Task
          </span>
        );
      if (entry.incoming) {
        return (
          <span
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium",
              bookedTone(false)
            )}
            title="Edit this booking from the day the log was worked"
          >
            <BookmarkCheck className="size-4 shrink-0" />
            <span className="truncate">
              Worked on {formatWorkDate(entry.log.workDate)}
            </span>
          </span>
        );
      }
      return <BookingDateCell entry={entry} max={today} />;
    }
  },
  {
    id: "bookingTime",
    header: "Booking time",
    cell: ({ row }) => {
      const { group, entry } = row.original;
      if (!entry || group.kind !== "project") return null;
      if (entry.incoming)
        return <span className="tabular-nums">{hours(entry.minutes)}</span>;
      return <BookingTimeCell entry={entry} />;
    }
  },
  {
    id: "worked",
    header: "Hours worked",
    meta: { align: "right" },
    cell: ({ row }) =>
      row.original.entry && !row.original.entry.first ? null : (
        <span className="tabular-nums">
          {hours((row.original.entry ?? row.original.group).worked)}
        </span>
      )
  },
  {
    id: "booked",
    header: "Hours booked",
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums">
        {hours((row.original.entry ?? row.original.group).booked)}
      </span>
    )
  }
];

/** Column widths (the `logs` column takes the rest). */
const WIDTHS = ["16%", "14%", undefined, "20rem", "8rem", "8rem", "8rem"];

/** Headers left blank while every row is collapsed (kept as cells, so the column widths don't change). */
const BLANK_WHEN_COLLAPSED = ["tasks", "logs", "booking", "bookingTime"];
/** A collapsed project row keeps its Booking date cell (Book all). */
const HIDDEN_IN_COLLAPSED_ROW = ["tasks", "logs"];

const alignOf = (meta: unknown) =>
  (meta as { align?: "right" } | undefined)?.align;

/** One listed day of the Bookings range (SCR-045): the heading, six figure cards, then a row per group, expandable to its logs. */
export function DaySection({
  day,
  isToday,
  today
}: {
  day: BookingDay;
  isToday: boolean;
  today: string;
}) {
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const data = useMemo(() => rowsOf(day), [day]);
  const table = useReactTable({
    data,
    columns,
    state: { expanded },
    onExpandedChange: setExpanded,
    getRowId: (r) => r.id,
    getSubRows: (r) => r.subRows,
    getRowCanExpand: (r) => r.depth === 0,
    meta: { today, workDate: day.workDate },
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel()
  });

  const anyOpen = table
    .getRowModel()
    .rows.some((r) => r.depth === 0 && r.getIsExpanded());

  return (
    <section
      aria-label={day.workDate}
      className="overflow-hidden rounded-lg bg-card"
    >
      <h2 className="flex items-baseline gap-2 bg-primary/10 px-4 py-3 text-lg font-semibold tracking-tight">
        {format(parseISO(day.workDate), "EEEE, d MMMM yyyy")}
        {isToday ? (
          <span className="text-xs font-normal text-primary">Today</span>
        ) : null}
      </h2>
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
          <Stat label="Logged" value={hours(day.logged)} />
          <Stat label="Billable" value={hours(day.billable)} />
          <Stat label="Overtime" value={hours(day.overtime)} />
          <Stat
            label="Booked current"
            value={hours(day.bookedCurrent)}
            hint="Hours of this day's own logs that are booked to this day."
          />
          <Stat
            label="Booked from external"
            value={hours(day.bookedExternal)}
            hint="Hours of logs worked on other days that are booked to this day."
          />
          <Stat
            label="Booked total"
            value={hours(day.bookedTotal)}
            hint="Booked current plus Booked from external: all hours booked to this day."
          />
        </div>
        <BookingDraftsProvider>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <colgroup>
                {WIDTHS.map((w, i) => (
                  <col key={i} style={{ width: w }} />
                ))}
              </colgroup>
              <TableHeader>
                {table.getHeaderGroups().map((group) => (
                  <TableRow key={group.id}>
                    {group.headers.map((h) => {
                      const blank =
                        !anyOpen && BLANK_WHEN_COLLAPSED.includes(h.column.id);
                      return (
                        <TableHead
                          key={h.id}
                          className="px-4 font-semibold text-foreground"
                        >
                          {blank
                            ? null
                            : !anyOpen && h.column.id === "project"
                              ? "Projects"
                              : flexRender(
                                  h.column.columnDef.header,
                                  h.getContext()
                                )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => {
                  const collapsed = row.depth === 0 && !row.getIsExpanded();
                  return (
                    <TableRow
                      key={row.id}
                      className={cn(
                        "transition-colors",
                        row.depth === 0
                          ? "cursor-pointer hover:bg-primary/10"
                          : "bg-muted/30 hover:bg-muted/50",
                        // The rows of one log read as one block: a dashed line between them.
                        row.original.entry &&
                          !row.original.entry.last &&
                          "border-dashed"
                      )}
                      onClick={
                        row.depth === 0
                          ? (e) => {
                              if (
                                !(e.target as HTMLElement).closest(
                                  "a,button,input,[role=dialog]"
                                )
                              )
                                row.toggleExpanded();
                            }
                          : undefined
                      }
                    >
                      {row.getVisibleCells().map((cell) => {
                        const id = cell.column.id;
                        if (collapsed && HIDDEN_IN_COLLAPSED_ROW.includes(id))
                          return null;
                        return (
                          <TableCell
                            key={cell.id}
                            colSpan={collapsed && id === "project" ? 3 : 1}
                            className={cn(
                              "px-4",
                              alignOf(cell.column.columnDef.meta) === "right" &&
                                "whitespace-nowrap"
                            )}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </BookingDraftsProvider>
      </div>
    </section>
  );
}
