"use client";

import { useMemo } from "react";
import { parseAsString, useQueryStates } from "nuqs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyTitle
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/features/users/api";
import { today as todayIn } from "@/lib/time";
import { useDashboardReport, useProjectCount, useTaskCounts } from "../api";
import {
  parseRange,
  presetRange,
  rangeLabel,
  weekdaysSoFar,
  type DateRange
} from "../range";
import { buckets, dayStats, running, totals } from "../stats";
import { HoursSummary } from "./hours-summary";
import { KpiTiles } from "./kpi-tiles";
import { ProjectHours } from "./project-hours";
import { RangePicker } from "./range-picker";
import { RunningTotals } from "./running-totals";
import { WorkdayChart } from "./workday-chart";

/** Series colors (validated categorical slots, light and dark steps): worked blue, booked aqua, start orange. */
const COLORS =
  "[--dash-worked:#2a78d6] [--dash-booked:#1baf7a] [--dash-start:#eb6834] " +
  "dark:[--dash-worked:#3987e5] dark:[--dash-booked:#199e70] dark:[--dash-start:#d95926]";

/** The dashboard page body (SCR-010): counts, then the range's workdays and hours. The range is in the URL (`from`, `to`); default this month. */
export function DashboardView() {
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
  const report = useDashboardReport(range.from, range.to);
  const projectCount = useProjectCount();
  const taskCounts = useTaskCounts();
  const data = report.data;

  const stats = useMemo(() => {
    if (!data) return undefined;
    const days = dayStats(range, data.days);
    return {
      totals: totals(days, target),
      buckets: buckets(days, target),
      running: running(days, target, today)
    };
  }, [data, range, target, today]);

  const onChange = (next: DateRange) => {
    const def = presetRange("this-month", today);
    void setQuery(
      next.from === def.from && next.to === def.to
        ? { from: null, to: null }
        : next
    );
  };

  const failed = report.isError || me.isError;
  const loading = !failed && (!me.data || !data || !stats);

  return (
    <div className={`space-y-4 ${COLORS}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{rangeLabel(range)}</p>
        </div>
        <RangePicker value={range} today={today} onChange={onChange} />
      </div>
      <KpiTiles
        projects={projectCount.count}
        projectsError={projectCount.isError}
        tasks={taskCounts.counts}
        tasksError={taskCounts.isError}
        projectsWithTime={
          data
            ? data.projects.filter((p) => p.kind === "project").length
            : undefined
        }
        totals={stats?.totals}
        reportError={failed}
        weekdays={weekdaysSoFar(range, today)}
      />
      {failed ? (
        <Card className="border rounded-md!">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Couldn&apos;t load the dashboard.</EmptyTitle>
            </EmptyHeader>
            <EmptyContent>
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => {
                  if (me.isError) void me.refetch();
                  if (report.isError) void report.refetch();
                }}
              >
                Retry
              </Button>
            </EmptyContent>
          </Empty>
        </Card>
      ) : loading || !data || !stats ? (
        <div
          className="grid grid-cols-1 gap-4 xl:grid-cols-12"
          aria-busy="true"
        >
          <Skeleton className="h-96 xl:col-span-8" />
          <Skeleton className="h-96 xl:col-span-4" />
          <Skeleton className="h-80 xl:col-span-7" />
          <Skeleton className="h-80 xl:col-span-5" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="min-w-0 xl:col-span-8">
            <WorkdayChart
              items={stats.buckets.items}
              by={stats.buckets.by}
              targetMinutes={target}
              avgStart={stats.totals.avgStart}
              today={today}
            />
          </div>
          <div className="min-w-0 xl:col-span-4">
            <HoursSummary t={stats.totals} targetMinutes={target} />
          </div>
          <div className="min-w-0 xl:col-span-7">
            <RunningTotals points={stats.running} />
          </div>
          <div className="min-w-0 xl:col-span-5">
            <ProjectHours rows={data.projects} />
          </div>
        </div>
      )}
    </div>
  );
}
