"use client";

import { parseAsString, useQueryStates } from "nuqs";
import { parseISO } from "date-fns";
import { useProjects } from "@/proto/features/projects/api";
import { useTasks } from "@/proto/features/tasks/api";
import type { TaskStatus } from "@/proto/features/tasks/status";
import {
  useBookings,
  useDayStarts,
  useLogsInRange,
  useMeSettings
} from "@/proto/mock/hooks";
import { today as todayIn } from "@/lib/time";
import { eachDay, presetRange, rangeLabel, type DateRange } from "../range";
import { buckets, byProject, dayStats, running, totals } from "../stats";
import { HoursSummary } from "./hours-summary";
import { KpiTiles } from "./kpi-tiles";
import { ProjectHours } from "./project-hours";
import { RangePicker } from "./range-picker";
import { RunningTotals } from "./running-totals";
import { WorkdayChart } from "./workday-chart";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Series colors (validated categorical slots, light and dark steps): worked blue, booked aqua, start orange. */
const COLORS =
  "[--dash-worked:#2a78d6] [--dash-booked:#1baf7a] [--dash-start:#eb6834] " +
  "dark:[--dash-worked:#3987e5] dark:[--dash-booked:#199e70] dark:[--dash-start:#d95926]";

function useTaskCount(status: TaskStatus): number | undefined {
  return useTasks({
    statuses: [status],
    q: "",
    sort: "updatedAt:desc",
    page: 1,
    pageSize: 1
  }).data?.total;
}

/** Prototype: `/app`. Counts, then the range's workdays and hours. The range is in the URL (`from`, `to`); default this month. */
export function DashboardView() {
  const { timeZone, dailyTargetMinutes } = useMeSettings();
  const today = todayIn(timeZone);
  const [params, setParams] = useQueryStates(
    { from: parseAsString, to: parseAsString },
    { history: "replace" }
  );
  const fallback = presetRange("this-month", today, timeZone);
  const range: DateRange =
    params.from &&
    params.to &&
    DATE_RE.test(params.from) &&
    DATE_RE.test(params.to) &&
    params.from <= params.to
      ? { from: params.from, to: params.to }
      : fallback;
  const setRange = (r: DateRange) =>
    setParams(
      r.from === fallback.from && r.to === fallback.to
        ? { from: null, to: null }
        : r
    );

  const projects = useProjects({
    q: "",
    sort: "updatedAt:desc",
    page: 1,
    pageSize: 1
  }).data?.total;
  const upcoming = useTaskCount("upcoming");
  const inProgress = useTaskCount("in-progress");
  const completed = useTaskCount("completed");
  const tasks =
    upcoming !== undefined &&
    inProgress !== undefined &&
    completed !== undefined
      ? { upcoming, "in-progress": inProgress, completed }
      : undefined;

  const logs = useLogsInRange(range.from, range.to);
  const starts = useDayStarts(range.from, range.to);
  const bookings = useBookings();

  const days = dayStats(eachDay(range), logs, starts, bookings);
  const t = totals(days, dailyTargetMinutes);
  const chart = buckets(days, dailyTargetMinutes);
  const points = running(days, dailyTargetMinutes, today);
  const projectRows = byProject(logs, bookings);
  const weekdays = days.filter(
    (d) =>
      d.workDate <= today && ![0, 6].includes(parseISO(d.workDate).getDay())
  ).length;

  return (
    <div className={`space-y-4 ${COLORS}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {rangeLabel(range, timeZone)}
          </p>
        </div>
        <RangePicker
          value={range}
          today={today}
          timeZone={timeZone}
          onChange={setRange}
        />
      </div>
      <KpiTiles
        projects={projects}
        projectsError={false}
        tasks={tasks}
        tasksError={false}
        projectsWithTime={
          projectRows.filter((r) => r.kind === "project").length
        }
        totals={t}
        reportError={false}
        weekdays={weekdays}
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8">
          <WorkdayChart
            items={chart.items}
            by={chart.by}
            targetMinutes={dailyTargetMinutes}
            avgStart={t.avgStart}
            today={today}
          />
        </div>
        <div className="min-w-0 xl:col-span-4">
          <HoursSummary t={t} targetMinutes={dailyTargetMinutes} />
        </div>
        <div className="min-w-0 xl:col-span-7">
          <RunningTotals points={points} />
        </div>
        <div className="min-w-0 xl:col-span-5">
          <ProjectHours rows={projectRows} />
        </div>
      </div>
    </div>
  );
}
