"use client";

import { FolderKanban, ListTodo } from "lucide-react";
import { ProjectIcon } from "@/proto/features/projects/components/project-icon";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDuration } from "@/lib/time";
import { formatClock } from "@/lib/time/clock";
import { cn } from "@/lib/utils";
import { useNowMinute } from "../api";
import {
  timeline,
  timelineGroups,
  type LogGroup,
  type TimelineRow
} from "../day";
import type { LogLink } from "../last-log-link";
import type { Day, Ref } from "../types";
import { DeletedName } from "./deleted-marker";
import { LogActions } from "./log-row";
import { GroupLogButton, LogLinkButton, logLink } from "./group-log-button";

function RefName({ ref_ }: { ref_: Ref }) {
  return !ref_.id || ref_.deleted ? (
    <DeletedName title={ref_.title} />
  ) : (
    <>{ref_.title}</>
  );
}

/** Without a start: time since the first log began (0h, 30m, 1h 45m…). */
const elapsed = (m: number) => (m === 0 ? "0h" : formatDuration(m));

/** A project group (not Unsorted, Non-prod or a deleted project): it has an icon. */
const isProject = (key: string) =>
  key !== "unsorted" && key !== "nonprod" && !key.startsWith("deleted:");

/** SCR-040 Timeline view: the day's logs as staggered bars, each starting where the previous one ended
 *  (the landing page's hero timeline, on the real day), grouped by project as By Project. A collapsed
 *  group draws its logs on one track where they fall; an open one, a row per log. Today, a line marks now. */
export function LogTimeline({
  day,
  groups,
  colors,
  isToday,
  timeZone,
  open,
  onOpenChange,
  onLog
}: {
  day: Day;
  /** `groupLogs(day.logs, "project")`. */
  groups: LogGroup[];
  colors: Record<string, string>;
  isToday: boolean;
  timeZone: string;
  /** Keys of the open groups. */
  open: string[];
  onOpenChange: (open: string[]) => void;
  /** Log time preset to a group's project (its +). */
  onLog: (link: LogLink) => void;
}) {
  const now = useNowMinute(timeZone, isToday);
  const t = timeline(day.startMinute, day.logs, now);
  const span = t.axisEnd - t.axisStart;
  const pct = (m: number) => `${((m - t.axisStart) / span) * 100}%`;
  const label = t.clock ? formatClock : elapsed;
  const nowAt =
    t.clock && now !== null && now >= t.axisStart && now <= t.axisEnd
      ? now
      : null;

  /** A track with the given rows' bars at their places on the axis. */
  const track = (rows: TimelineRow[], delayFrom = 0) => (
    <div className="relative h-2 overflow-hidden rounded-full bg-muted">
      {rows.map(({ log, from }, i) => (
        <span
          key={log.id}
          className="absolute inset-y-0 rounded-full fill-mode-both motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-3 motion-safe:duration-500"
          style={{
            left: pct(from),
            width: `${(log.durationMinutes / span) * 100}%`,
            background: colors[log.id],
            animationDelay: `${Math.min(delayFrom + i, 12) * 60}ms`
          }}
        />
      ))}
      {nowAt !== null ? (
        <span
          aria-hidden
          className="absolute inset-y-0 w-px bg-foreground/60"
          style={{ left: pct(nowAt) }}
        />
      ) : null}
    </div>
  );

  return (
    <Card className="border rounded-md! gap-0 py-0">
      <Accordion
        multiple
        className="px-4"
        value={open}
        onValueChange={(v) => onOpenChange(v as string[])}
      >
        {timelineGroups(t, groups).map(({ group: g, rows }, gi) => {
          const project = g.logs[0].project;
          const isOpen = open.includes(g.key);
          return (
            <AccordionItem key={g.key} value={g.key}>
              {/* A div, not a button, so the group's + (a button) can sit inside it. */}
              <AccordionTrigger
                nativeButton={false}
                render={<div />}
                className="cursor-pointer items-center gap-2 py-3 hover:no-underline sm:gap-3"
              >
                {isProject(g.key) ? (
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
                    ) : project ? (
                      <RefName ref_={project} />
                    ) : null}
                  </span>
                  <GroupLogButton group={g} by="project" onLog={onLog} />
                </span>
                <span className="hidden text-xs font-normal text-muted-foreground sm:inline">
                  {g.logs.length} {g.logs.length === 1 ? "log" : "logs"}
                </span>
                <span className="shrink-0 whitespace-nowrap text-sm font-medium tabular-nums">
                  {formatDuration(g.totalMinutes)}
                </span>
              </AccordionTrigger>
              {isOpen ? null : (
                <div data-testid="timeline-group-track" className="pb-3">
                  {track(rows, gi)}
                </div>
              )}
              <AccordionContent className="pb-3">
                <ol className="flex flex-col gap-3">
                  {rows.map(({ log, from, to }, i) => (
                    <li key={log.id} className="flex flex-col gap-1.5">
                      <div className="flex min-w-0 items-center gap-2 pl-4 text-sm sm:pl-5">
                        <span
                          aria-hidden
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ background: colors[log.id] }}
                        />
                        <LogText
                          log={log}
                          withProject={!isProject(g.key)}
                          onLog={onLog}
                        />
                        {log.excludeFromStats ? (
                          <Badge variant="outline" className="shrink-0">
                            Non-prod
                          </Badge>
                        ) : null}
                        <span className="ml-auto hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:inline">
                          {label(from)}–{label(to)}
                        </span>
                        <span className="shrink-0 font-medium tabular-nums sm:w-16 sm:text-right">
                          {formatDuration(log.durationMinutes)}
                        </span>
                        <LogActions log={log} className="-my-1.5" />
                      </div>
                      {track([{ log, from, to }], i)}
                    </li>
                  ))}
                </ol>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
      <div
        aria-hidden
        className="relative mx-4 mt-1 mb-3 h-4 text-[11px] tabular-nums text-muted-foreground"
      >
        {t.ticks.map((tick, i) => (
          <span
            key={tick}
            className={cn(
              "absolute",
              i === 0
                ? ""
                : i === t.ticks.length - 1
                  ? "-translate-x-full"
                  : "-translate-x-1/2"
            )}
            style={{ left: pct(tick) }}
          >
            {label(tick)}
          </span>
        ))}
      </div>
      {nowAt !== null ? (
        <p className="mx-4 border-t py-3 text-xs text-muted-foreground">
          Now {formatClock(nowAt)}
        </p>
      ) : null}
    </Card>
  );
}

/** A log's "Project · Task + · Title text": the project only outside a project's group (Unsorted, Non-prod, deleted).
 *  A live task gets a + beside its name (as on By Task), so the "Project · Task" part stays whole and the rest truncates. */
function LogText({
  log,
  withProject,
  onLog
}: {
  log: TimelineRow["log"];
  withProject: boolean;
  onLog: (link: LogLink) => void;
}) {
  const project = withProject ? log.project : null;
  const link = log.task ? logLink(log, "task") : null;
  return (
    <span className="flex min-w-0 items-center gap-1">
      {project || log.task ? (
        <span className="flex max-w-[60%] shrink-0 items-center gap-1.5 text-muted-foreground">
          {project ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <FolderKanban className="size-3.5 shrink-0" />
              <span className="truncate">
                <RefName ref_={project} />
              </span>
            </span>
          ) : null}
          {project && log.task ? <span aria-hidden>·</span> : null}
          {log.task ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <ListTodo className="size-3.5 shrink-0" />
              <span className="truncate">
                <RefName ref_={log.task} />
              </span>
            </span>
          ) : null}
        </span>
      ) : null}
      {link ? <LogLinkButton link={link} onLog={onLog} /> : null}
      <span className="min-w-0 truncate">
        {project || log.task ? (
          <span className="text-muted-foreground">· </span>
        ) : null}
        {log.title ? <span className="font-semibold">{log.title} </span> : null}
        {log.text}
      </span>
    </span>
  );
}
