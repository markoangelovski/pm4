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
import { formatDuration, formatWorkDate } from "@/lib/time";
import { routes } from "@/proto/lib/routes";
import { LOGGED_TIME_PAGE_SIZE, useEntityLogs } from "@/proto/mock/hooks";

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
  const { items, total, totalMinutes, bookedMinutes } = useEntityLogs(
    { projectId, taskId },
    Math.max(1, page)
  );
  const pageCount = Math.max(1, Math.ceil(total / LOGGED_TIME_PAGE_SIZE));
  const showTask = projectId !== undefined;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Logged time</CardTitle>
        <span className="text-sm font-medium tabular-nums text-muted-foreground">
          Total worked: {formatDuration(totalMinutes)}
          <span className="ml-4">Booked: {formatDuration(bookedMinutes)}</span>
        </span>
      </CardHeader>
      <CardContent className="px-0">
        {total === 0 ? (
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
                {items.map((l) => (
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
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    ) : null}
                    <TableCell className="whitespace-nowrap">
                      {l.bookingDate ? formatWorkDate(l.bookingDate) : "-"}
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
