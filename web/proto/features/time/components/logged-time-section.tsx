"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { parseAsInteger, useQueryState } from "nuqs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDuration, formatWorkDate } from "@/lib/time";
import { routes } from "@/proto/lib/routes";
import { TIME_LOG_PAGE_SIZE, useTimeLogs, type TimeLogList } from "../api";
import { DeletedName } from "./deleted-marker";
import {
  LOGGED_COLORS,
  LoggedTimeChart,
  LoggedTotals
} from "./logged-time-chart";

/**
 * A log's bookings, one per line ("6 Oct 2026 · 30m"), then "30m unbooked" while part of it is left;
 * "-" when it has none.
 */
function BookedDates({ log }: { log: TimeLogList["items"][number] }) {
  if (!log.bookings.length) return <>-</>;
  const left =
    log.durationMinutes - log.bookings.reduce((t, b) => t + b.minutes, 0);
  return (
    <div className="flex flex-col">
      {log.bookings.map((b) => (
        <span key={b.date}>
          {formatWorkDate(b.date)}
          <span className="text-muted-foreground tabular-nums">
            {" "}
            · {formatDuration(b.minutes)}
          </span>
        </span>
      ))}
      {left > 0 ? (
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatDuration(left)} unbooked
        </span>
      ) : null}
    </div>
  );
}

/** SCR-044: the logged time of one project (with a Task column) or one task, as a chart or a table (like the dashboard's Workdays). */
export function LoggedTimeSection({
  projectId,
  taskId
}: {
  projectId?: string;
  taskId?: string;
}) {
  const [page, setPage] = useQueryState(
    "logsPage",
    parseAsInteger.withDefault(1).withOptions({ clearOnDefault: true })
  );
  const logs = useTimeLogs(
    projectId !== undefined ? { projectId } : { taskId: taskId ?? "" },
    Math.max(1, page)
  );
  const data = logs.data;
  const pageCount = Math.max(
    1,
    Math.ceil((data?.total ?? 0) / TIME_LOG_PAGE_SIZE)
  );
  const showTask = projectId !== undefined;
  const [view, setView] = useState<"chart" | "table">("chart");

  return (
    <Card className={`gap-0! border rounded-md! py-0! ${LOGGED_COLORS}`}>
      <CardHeader className="flex h-11 flex-row items-center justify-between border-b px-4 py-0!">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Clock size={16} className="text-muted-foreground" /> Logged time
        </CardTitle>
        <Tabs
          value={view}
          onValueChange={(v) => setView(v as "chart" | "table")}
        >
          <TabsList className="h-8">
            <TabsTrigger
              value="chart"
              className="cursor-pointer px-2.5 text-xs"
            >
              Chart
            </TabsTrigger>
            <TabsTrigger
              value="table"
              className="cursor-pointer px-2.5 text-xs"
            >
              Table
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {data && data.total > 0 ? (
          <LoggedTotals
            worked={data.totalMinutes}
            booked={data.bookedMinutes}
          />
        ) : null}
        {logs.isError ? (
          <div className="flex flex-col items-center gap-3 py-6 text-sm text-muted-foreground">
            <p>Couldn&apos;t load the logs.</p>
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => void logs.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : !data ? (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : data.total === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No time logged yet.
          </p>
        ) : view === "chart" ? (
          <LoggedTimeChart days={data.days} />
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date worked</TableHead>
                  <TableHead>Log</TableHead>
                  {showTask ? <TableHead>Task</TableHead> : null}
                  <TableHead>Booked date</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap">
                      <Link
                        href={`${routes.app.time}?date=${l.workDate}`}
                        className="hover:text-primary hover:underline"
                      >
                        {formatWorkDate(l.workDate)}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-96 truncate" title={l.text}>
                      {l.text}
                    </TableCell>
                    {showTask ? (
                      <TableCell className="truncate">
                        {l.task?.id ? (
                          <Link
                            href={`${routes.app.task}?id=${l.task.id}`}
                            className="hover:text-primary hover:underline"
                          >
                            {l.task.title}
                          </Link>
                        ) : l.task ? (
                          <DeletedName title={l.task.title} />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    ) : null}
                    <TableCell className="whitespace-nowrap">
                      <BookedDates log={l} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {formatDuration(l.durationMinutes)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {view === "table" && pageCount > 1 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Page {page} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              disabled={page <= 1}
              onClick={() => void setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              disabled={page >= pageCount}
              onClick={() => void setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
