"use client";

import { useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { ChevronsDownUp, ChevronsUpDown, ClockPlus, Plus } from "lucide-react";
import { ProjectIcon } from "@/proto/features/projects/components/project-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@/components/ui/empty";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDuration, formatWorkDate, today as todayIn } from "@/lib/time";
import { useMe } from "@/proto/features/users/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useDay } from "../api";
import { groupLogs, rowFields, type LogGroup } from "../day";
import type { LogLink } from "../last-log-link";
import type { Ref } from "../types";
import { DeletedName } from "./deleted-marker";
import { DayCharts, logColors } from "./day-charts";
import { DayHeader } from "./day-header";
import { usePmspaAction } from "@/proto/features/integrations/components/push-button";
import { DayMenu } from "./day-menu";
import { DayPicker } from "./day-picker";
import { LogFormDialog } from "./log-form-dialog";
import { LogRow } from "./log-row";
import { LogTimeline } from "./log-timeline";

const VIEWS = ["timeline", "project", "task", "sequential"] as const;
const VIEW_LABELS = {
  timeline: "Timeline",
  project: "By Project",
  task: "By Task",
  sequential: "Sequential"
} as const;
type View = (typeof VIEWS)[number];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True for a well-formed `YYYY-MM-DD` that is a real calendar day (rejects 2026-02-31). */
function isRealDate(d: string): boolean {
  if (!DATE_RE.test(d)) return false;
  const parsed = parseISO(d);
  return isValid(parsed) && format(parsed, "yyyy-MM-dd") === d;
}

/** SCR-040: heading, date picker, day header, charts, view toggle and the logs. */
export function DayView() {
  const me = useMe();
  const timeZone = me.data?.timeZone ?? "UTC";
  const dailyTargetMinutes = me.data?.dailyTargetMinutes ?? 0;
  const today = todayIn(timeZone);
  const [params, setParams] = useQueryStates(
    {
      date: parseAsString,
      view: parseAsStringLiteral(VIEWS).withDefault("timeline")
    },
    { history: "replace", clearOnDefault: true }
  );
  const date =
    params.date && isRealDate(params.date) && params.date <= today
      ? params.date
      : today;
  const view = params.view;
  const setDate = (d: string) => setParams({ date: d === today ? null : d });
  const dayQuery = useDay(date);
  const day = dayQuery.data;
  const [logging, setLogging] = useState(false);
  // The + of a project or task group: a new log preset to it (undefined: the main Log time buttons).
  const [preset, setPreset] = useState<LogLink | undefined>(undefined);
  const logTime = (link?: LogLink) => {
    setPreset(link);
    setLogging(true);
  };
  // Push to PMSPA, an item of the day's ⋯ menu (FR-INT-012): its dialog renders here, so it outlives the menu.
  const push = usePmspaAction({
    target: { type: "day", id: date },
    label: `the logs of ${formatWorkDate(date)}`,
    disabled: !day || day.logs.length === 0
  });
  const [open, setOpen] = useState<
    Record<"timeline" | "project" | "task", string[]>
  >({
    timeline: [],
    project: [],
    task: []
  });

  if (me.isError || dayQuery.isError) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Logs</h1>
        <Card className="border rounded-md!">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Couldn&apos;t load the day.</EmptyTitle>
            </EmptyHeader>
            <EmptyContent>
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => {
                  if (me.isError) void me.refetch();
                  if (dayQuery.isError) void dayQuery.refetch();
                }}
              >
                Retry
              </Button>
            </EmptyContent>
          </Empty>
        </Card>
      </div>
    );
  }
  if (!me.data || !day) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const colors = logColors(day.logs);
  const groups = {
    project: groupLogs(day.logs, "project"),
    task: groupLogs(day.logs, "task")
  };
  // Timeline groups by project too (its own open groups).
  const grouped = view !== "sequential";
  const keys = grouped
    ? groups[view === "task" ? "task" : "project"].map((g) => g.key)
    : [];
  const allOpen =
    keys.length > 0 &&
    keys.every((k) =>
      open[view as "timeline" | "project" | "task"].includes(k)
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Logs</h1>
        <Button className="cursor-pointer" onClick={() => logTime()}>
          <Plus data-icon="inline-start" /> Log time
        </Button>
      </div>
      <DayPicker
        date={date}
        today={today}
        timeZone={timeZone}
        onChange={setDate}
        actions={<DayMenu day={day} today={today} push={push} />}
      />
      {push.dialog}
      <DayHeader
        day={day}
        isToday={date === today}
        timeZone={timeZone}
        targetMinutes={dailyTargetMinutes}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_28rem]">
        <div className="min-w-0">
          {day.logs.length === 0 ? (
            <Card className="border rounded-md!">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ClockPlus />
                  </EmptyMedia>
                  <EmptyTitle>No logs for this day</EmptyTitle>
                  <EmptyDescription>
                    Log time to start the day.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button className="cursor-pointer" onClick={() => logTime()}>
                    <Plus data-icon="inline-start" /> Log time
                  </Button>
                </EmptyContent>
              </Empty>
            </Card>
          ) : (
            <Tabs
              value={view}
              onValueChange={(v) => setParams({ view: v as View })}
            >
              <div className="flex h-11 items-center justify-between border-b">
                <TabsList variant="line" className="h-full justify-start">
                  {VIEWS.map((v) => (
                    <TabsTrigger
                      key={v}
                      value={v}
                      className="flex-none cursor-pointer px-3"
                    >
                      {VIEW_LABELS[v]}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {grouped ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() =>
                      setOpen((o) => ({ ...o, [view]: allOpen ? [] : keys }))
                    }
                  >
                    {allOpen ? (
                      <ChevronsDownUp data-icon="inline-start" />
                    ) : (
                      <ChevronsUpDown data-icon="inline-start" />
                    )}
                    {allOpen ? "Collapse all" : "Expand all"}
                  </Button>
                ) : null}
              </div>
              <TabsContent value="timeline">
                <LogTimeline
                  day={day}
                  groups={groups.project}
                  colors={colors}
                  isToday={date === today}
                  timeZone={timeZone}
                  open={open.timeline}
                  onOpenChange={(v) => setOpen((o) => ({ ...o, timeline: v }))}
                />
              </TabsContent>
              <TabsContent value="sequential">
                <Card className="divide-y border rounded-md! py-0">
                  {day.logs.map((l) => (
                    <LogRow key={l.id} log={l} color={colors[l.id]} />
                  ))}
                </Card>
              </TabsContent>
              {(["project", "task"] as const).map((by) => (
                <TabsContent key={by} value={by}>
                  <Card className="border rounded-md! py-0">
                    <Accordion
                      multiple
                      className="px-4"
                      value={open[by]}
                      onValueChange={(v) =>
                        setOpen((o) => ({ ...o, [by]: v as string[] }))
                      }
                    >
                      {groups[by].map((g) => (
                        <AccordionItem key={g.key} value={g.key}>
                          {/* A div, not a button, so the group's + (a button) can sit inside it. */}
                          <AccordionTrigger
                            nativeButton={false}
                            render={<div />}
                            className="cursor-pointer items-center gap-2 py-3 hover:no-underline sm:gap-3"
                          >
                            {g.key !== "unsorted" &&
                            g.key !== "nonprod" &&
                            !g.key.startsWith("deleted:") ? (
                              <ProjectIcon
                                project={{ id: g.key }}
                                className="size-5 rounded-md"
                              />
                            ) : null}
                            <span className="flex min-w-0 flex-1 items-center gap-1">
                              <span className="min-w-0 truncate text-sm font-semibold">
                                {g.key === "unsorted" ? (
                                  "Unsorted"
                                ) : g.key === "nonprod" ? (
                                  "Non-prod"
                                ) : (
                                  <GroupName group={g} by={by} />
                                )}
                              </span>
                              <GroupLogButton
                                group={g}
                                by={by}
                                onLog={logTime}
                              />
                            </span>
                            <span className="hidden text-xs text-muted-foreground sm:inline">
                              {g.logs.length}{" "}
                              {g.logs.length === 1 ? "log" : "logs"}
                            </span>
                            <span className="shrink-0 whitespace-nowrap text-sm font-medium tabular-nums">
                              {formatDuration(g.totalMinutes)}
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="pb-3 [&_a]:no-underline [&_p:not(:last-child)]:mb-0">
                            <div className="ml-2 divide-y border-l-2 pl-3 sm:ml-2.5 sm:pl-4">
                              {g.logs.map((l) => (
                                <LogRow
                                  key={l.id}
                                  log={l}
                                  nested
                                  color={colors[l.id]}
                                  show={rowFields(l, by, g.key)}
                                />
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
        <DayCharts
          logs={day.logs}
          targetMinutes={dailyTargetMinutes}
          by={view === "task" ? "task" : "project"}
        />
      </div>
      <LogFormDialog
        open={logging}
        onOpenChange={setLogging}
        preset={preset}
        defaultDate={date}
        onSaved={setDate}
      />
    </div>
  );
}

/** A group's project, or its task and the task's project; null for Unsorted, Non-prod and deleted ones. */
function groupLink(group: LogGroup, by: "project" | "task"): LogLink | null {
  const project = group.logs[0].project;
  if (!project?.id) return null;
  const projectRef = { id: project.id, title: project.title };
  if (by === "project") return { project: projectRef, task: null };
  const task = group.logs[0].task;
  return task?.id
    ? {
        project: projectRef,
        task: { id: task.id, title: task.title, project: projectRef }
      }
    : null;
}

/** The + beside a group's name: a new log preset to its project or task. It doesn't open or close the group. */
function GroupLogButton({
  group,
  by,
  onLog
}: {
  group: LogGroup;
  by: "project" | "task";
  onLog: (link: LogLink) => void;
}) {
  if (group.key === "unsorted" || group.key === "nonprod") return null;
  const link = groupLink(group, by);
  if (!link) return null;
  const label = `Log time to ${link.task?.title ?? link.project?.title}`;
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      title={label}
      className="shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
      onClick={(e) => {
        e.stopPropagation();
        onLog(link);
      }}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Plus />
    </Button>
  );
}

/** A deleted project or task: its name with the deleted marker (FR-TLOG-014). */
function GroupPart({ ref_, title }: { ref_: Ref | null; title: string }) {
  return ref_ && !ref_.id ? <DeletedName title={title} /> : <>{title}</>;
}

/** A project group's name, or "Project · Task" by task. A group's logs share its refs, so the first log tells
 *  whether they are deleted (a deleted group's key is `deleted:<title>`, so it has no icon either). */
function GroupName({ group, by }: { group: LogGroup; by: "project" | "task" }) {
  const first = group.logs[0];
  if (by === "project")
    return <GroupPart ref_={first.project} title={group.project ?? ""} />;
  return (
    <>
      {group.project ? (
        <>
          <GroupPart ref_={first.project} title={group.project} />{" "}
          <span className="text-muted-foreground">·</span>{" "}
        </>
      ) : null}
      <GroupPart ref_={first.task} title={group.task ?? ""} />
    </>
  );
}
