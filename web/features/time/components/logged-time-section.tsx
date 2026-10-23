"use client";

import Link from "next/link";
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
import { formatDuration, formatWorkDate } from "@/lib/time";
import { routes } from "@/lib/routes";
import { TIME_LOG_PAGE_SIZE, useTimeLogs, type TimeLogList } from "../api";
import { DeletedName } from "./deleted-marker";

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

/** SCR-044: the logged time of one project (with a Task column) or one task. */
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Logged time</CardTitle>
        {data ? (
          <span className="text-sm font-medium tabular-nums text-muted-foreground">
            Total worked: {formatDuration(data.totalMinutes)}
            <span className="ml-4">
              Booked: {formatDuration(data.bookedMinutes)}
            </span>
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="px-0">
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
          <div className="space-y-2 px-6" aria-busy="true">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : data.total === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No time logged yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
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
        {pageCount > 1 ? (
          <div className="flex items-center gap-2 pt-4 text-sm text-muted-foreground">
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
