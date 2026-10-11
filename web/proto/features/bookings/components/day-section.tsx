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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useBookingActions } from "@/proto/mock/hooks";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { ProjectIcon } from "@/proto/features/projects/components/project-icon";
import { formatDuration, formatWorkDate } from "@/lib/time";
import { routes } from "@/proto/lib/routes";
import { cn } from "@/lib/utils";
import type { BookingRow, DayFigures } from "../month";
import { BookingCell, bookedTone } from "./booking-cell";

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

/** A log's task: the task icon and an underlined link (deleted tasks are plain text). */
function LogTask({ row }: { row: BookingRow }) {
  const task = row.log?.task;
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
        <span className="truncate text-muted-foreground">
          {task.title} <span className="italic">(deleted)</span>
        </span>
      )}
    </span>
  );
}

/** Books every unbooked log of the project's day to that day. Null when there is nothing to book. */
function BookAllButton({ row }: { row: BookingRow }) {
  const { bookMany } = useBookingActions();
  const unbooked =
    row.group === "project"
      ? (row.subRows ?? []).filter(
          (l) => l.log && !l.incomingFrom && !l.bookingDate
        )
      : [];
  if (!unbooked.length) return null;
  return (
    <Button
      className="shrink-0 cursor-pointer rounded-md!"
      onClick={() =>
        bookMany(
          unbooked.map((l) => l.log!.id),
          unbooked[0].log!.workDate
        )
      }
    >
      Book all
    </Button>
  );
}

function ProjectCell({ row }: { row: Row<BookingRow> }) {
  const r = row.original;
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
      {r.projectId ? (
        <ProjectIcon
          project={{ id: r.projectId }}
          className="size-5 shrink-0 rounded-md"
        />
      ) : null}
      {r.projectId ? (
        <Link
          href={`${routes.app.project}?id=${r.projectId}`}
          className="truncate font-medium underline underline-offset-2 hover:text-primary"
        >
          {r.project}
        </Link>
      ) : (
        <span className="truncate font-medium">{r.project}</span>
      )}
    </div>
  );
}

/**
 * Six fixed columns, so widths never change. A collapsed project row spans Project + Tasks + Logs and keeps its
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
      row.original.log ? (
        <p className="truncate text-sm" title={row.original.log.text}>
          {row.original.log.text}
        </p>
      ) : null
  },
  {
    id: "booking",
    header: "Booking date",
    cell: ({ row, table }) => {
      const r = row.original;
      if (row.depth === 0) return <BookAllButton row={r} />;
      if (!r.log) return null;
      if (r.group === "nonprod") return null;
      if (r.group === "unsorted")
        return (
          <span className="text-sm text-muted-foreground">
            Add the log to a Project or Task
          </span>
        );
      if (r.incomingFrom) {
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
              Worked on {formatWorkDate(r.incomingFrom)}
            </span>
          </span>
        );
      }
      return (
        <BookingCell
          logId={r.log.id}
          workDate={r.log.workDate}
          bookingDate={r.bookingDate ?? null}
          max={(table.options.meta as { today: string }).today}
        />
      );
    }
  },
  {
    id: "worked",
    header: "Hours worked",
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums">{hours(row.original.minutes)}</span>
    )
  },
  {
    id: "booked",
    header: "Hours booked",
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums">{hours(row.original.booked)}</span>
    )
  }
];

/** Column widths (the `logs` column takes the rest). Inline: Tailwind doesn't scan the prototype. */
const WIDTHS = ["18%", "16%", undefined, "20rem", "8rem", "8rem"];

/** Headers left blank while every row is collapsed (kept as cells, so the column widths don't change). */
const BLANK_WHEN_COLLAPSED = ["tasks", "logs", "booking"];
/** A collapsed project row keeps its Booking date cell (Book all). */
const HIDDEN_IN_COLLAPSED_ROW = ["tasks", "logs"];

const alignOf = (meta: unknown) =>
  (meta as { align?: "right" } | undefined)?.align;

/** One day of the Bookings range: figure cards, then a row per project that has logs, expandable to its logs. */
export function DaySection({
  day,
  isToday,
  today
}: {
  day: DayFigures;
  isToday: boolean;
  today: string;
}) {
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const data = useMemo(() => day.projects, [day.projects]);
  const table = useReactTable({
    data,
    columns,
    state: { expanded },
    onExpandedChange: setExpanded,
    getRowId: (r) => r.id,
    getSubRows: (r) => r.subRows,
    getRowCanExpand: (r) => r.depth === 0,
    meta: { today },
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
            value={hours(day.bookedCurrent + day.bookedExternal)}
            hint="Booked current plus Booked from external: all hours booked to this day."
          />
        </div>
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
                        : "bg-muted/30 hover:bg-muted/50"
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
      </div>
    </section>
  );
}
