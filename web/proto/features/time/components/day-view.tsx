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
import { formatDuration, today as todayIn } from "@/lib/time";
import { useMe } from "@/proto/features/users/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useDay } from "../api";
import { groupLogs, rowFields } from "../day";
import { DayCharts, logColors } from "./day-charts";
import { DayHeader } from "./day-header";
import { DayPicker } from "./day-picker";
import { LogFormDialog } from "./log-form-dialog";
import { LogRow } from "./log-row";

const VIEWS = ["project", "task", "sequential"] as const;
const VIEW_LABELS = {
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
      view: parseAsStringLiteral(VIEWS).withDefault("project")
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
  const [open, setOpen] = useState<Record<"project" | "task", string[]>>({
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
  const keys = view === "sequential" ? [] : groups[view].map((g) => g.key);
  const allOpen =
    keys.length > 0 &&
    keys.every((k) => open[view as "project" | "task"].includes(k));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Logs</h1>
        <Button className="cursor-pointer" onClick={() => setLogging(true)}>
          <Plus data-icon="inline-start" /> Log time
        </Button>
      </div>
      <DayPicker
        date={date}
        today={today}
        timeZone={timeZone}
        onChange={setDate}
      />
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
                  <Button
                    className="cursor-pointer"
                    onClick={() => setLogging(true)}
                  >
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
                {view !== "sequential" ? (
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
                          <AccordionTrigger className="cursor-pointer items-center gap-2 py-3 hover:no-underline sm:gap-3">
                            {g.key !== "unsorted" && g.key !== "nonprod" ? (
                              <ProjectIcon
                                project={{ id: g.key }}
                                className="size-5 rounded-md"
                              />
                            ) : null}
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                              {g.key === "unsorted" ? (
                                "Unsorted"
                              ) : g.key === "nonprod" ? (
                                "Non-prod"
                              ) : g.task ? (
                                <>
                                  {g.project}{" "}
                                  <span className="text-muted-foreground">
                                    ·
                                  </span>{" "}
                                  {g.task}
                                </>
                              ) : (
                                g.project
                              )}
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
        defaultDate={date}
        onSaved={setDate}
      />
    </div>
  );
}
