"use client";

import Link from "next/link";
import {
  CalendarCheck,
  Clock,
  FolderKanban,
  ListChecks,
  type LucideIcon
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "@/features/tasks/status";
import { routes } from "@/lib/routes";
import { formatClock } from "@/lib/time/clock";
import type { TaskCounts } from "../api";
import type { Totals } from "../stats";

const BAR: Record<(typeof TASK_STATUSES)[number], string> = {
  upcoming: "bg-chart-4",
  "in-progress": "bg-primary",
  completed: "bg-chart-2"
};

function Tile({
  label,
  icon: Icon,
  value,
  footer,
  href
}: {
  label: string;
  icon: LucideIcon;
  /** undefined = loading. */
  value: React.ReactNode | undefined;
  footer?: React.ReactNode;
  href?: string;
}) {
  const body = (
    <Card className="h-full gap-2 border rounded-md! p-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        <Icon size={16} />
      </div>
      {value === undefined ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <div className="text-3xl font-semibold tabular-nums">{value}</div>
      )}
      <div className="text-xs text-muted-foreground">{footer}</div>
    </Card>
  );
  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

const DASH = "—";

/** The four count tiles of SCR-010. `undefined` = loading; the matching error flag shows "—". */
export function KpiTiles({
  projects,
  projectsError,
  tasks,
  tasksError,
  projectsWithTime,
  totals,
  reportError,
  weekdays
}: {
  projects: number | undefined;
  projectsError: boolean;
  tasks: TaskCounts | undefined;
  tasksError: boolean;
  projectsWithTime: number | undefined;
  totals: Totals | undefined;
  reportError: boolean;
  weekdays: number;
}): React.JSX.Element {
  const taskTotal = tasks
    ? tasks.upcoming + tasks["in-progress"] + tasks.completed
    : undefined;
  const fromReport = (v: React.ReactNode | undefined) =>
    reportError ? DASH : v;
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <Tile
        label="Projects"
        icon={FolderKanban}
        href={routes.app.projects}
        value={projectsError ? DASH : projects}
        footer={
          projectsWithTime === undefined
            ? reportError
              ? null
              : <Skeleton className="h-3 w-32" />
            : `${projectsWithTime} with time logged in this range`
        }
      />
      <Tile
        label="Tasks"
        icon={ListChecks}
        href={routes.app.tasks}
        value={tasksError ? DASH : taskTotal}
        footer={
          tasks ? (
            <div className="space-y-1.5">
              <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
                {TASK_STATUSES.map((s) => (
                  <div
                    key={s}
                    className={BAR[s]}
                    style={{ flexGrow: tasks[s] }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {TASK_STATUSES.map((s) => (
                  <span key={s} className="flex items-center gap-1">
                    <span className={`size-2 rounded-full ${BAR[s]}`} />
                    {TASK_STATUS_LABELS[s]}
                    <span className="tabular-nums">{tasks[s]}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null
        }
      />
      <Tile
        label="Workdays"
        icon={CalendarCheck}
        value={fromReport(totals?.workdays)}
        footer={`Days with a start time, of ${weekdays} weekday${weekdays === 1 ? "" : "s"} so far`}
      />
      <Tile
        label="Average start"
        icon={Clock}
        value={fromReport(
          totals
            ? totals.avgStart === null
              ? DASH
              : formatClock(totals.avgStart)
            : undefined
        )}
        footer={
          totals
            ? totals.earliestStart === null || totals.latestStart === null
              ? "No workdays in this range"
              : `Earliest ${formatClock(totals.earliestStart)} · latest ${formatClock(totals.latestStart)}`
            : null
        }
      />
    </div>
  );
}
