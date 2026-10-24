"use client";

import { useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { ChevronsDownUp, ChevronsUpDown, ListChecks, Plus } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ProjectIcon } from "@/proto/features/projects/components/project-icon";
import { DeletedName } from "@/proto/features/time/components/deleted-marker";
import type { Todo } from "../api";
import {
  groupLink,
  groupTodos,
  shown,
  type TodoFilter,
  type TodoGroup
} from "../group";
import { TodoAddInput } from "./todo-add-input";
import { TodoRow } from "./todo-row";

const FILTERS: { value: TodoFilter; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "done", label: "Done" },
  { value: "all", label: "All" }
];

const EMPTY_TITLES = {
  search: "No to-dos match your search",
  range: "No to-dos in this time range",
  project: "No to-dos for this project",
  general: "No general to-dos",
  none: "No to-dos yet"
};

/**
 * The To-dos tab, below the shared toolbar: Open / Done / All, then one collapsible group per link (General, a
 * project, "Project · Task"), all open at first, each with "Add a to-do" for its link. General is always there on the
 * General and All views without a search or time range (Open or All), so a to-do can be added at once.
 */
export function TodosBoard({
  query,
  filtered,
  timeZone,
  onCreate
}: {
  query: UseQueryResult<Todo[], Error>;
  /** What narrows the list, for the empty state and the always-there General group. */
  filtered: "search" | "range" | "project" | "general" | null;
  timeZone: string;
  onCreate: () => void;
}) {
  const [filter, setFilter] = useState<TodoFilter>("open");
  // Ticked off (or reopened) here: they stay in the list until the filter changes.
  const [keep, setKeep] = useState<Set<string>>(new Set());
  const [closed, setClosed] = useState<string[]>([]);

  if (query.isError) {
    return (
      <Card className="border rounded-md!">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Couldn&apos;t load the to-dos.</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => void query.refetch()}
            >
              Retry
            </Button>
          </EmptyContent>
        </Empty>
      </Card>
    );
  }
  if (!query.data) {
    return (
      <div className="space-y-2" aria-busy="true">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const all = query.data;
  const visible = all.filter((t) => shown(t, filter, keep));
  const groups = groupTodos(visible);
  if (
    (filtered === null || filtered === "general") &&
    filter !== "done" &&
    !groups.some((g) => g.key === "general")
  )
    groups.unshift({
      key: "general",
      project: null,
      task: null,
      todos: [],
      openCount: 0
    });
  const keys = groups.map((g) => g.key);
  const allOpen = keys.every((k) => !closed.includes(k));

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <ToggleGroup
        variant="outline"
        size="sm"
        spacing={0}
        aria-label="Show"
        value={[filter]}
        onValueChange={(value) => {
          const next = value[0] as TodoFilter | undefined;
          if (next) {
            setFilter(next);
            setKeep(new Set());
          }
        }}
      >
        {FILTERS.map((f) => (
          <ToggleGroupItem
            key={f.value}
            value={f.value}
            className="cursor-pointer bg-background px-3"
          >
            {f.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {groups.length > 0 ? (
        <Button
          variant="ghost"
          size="sm"
          className="cursor-pointer"
          onClick={() => setClosed(allOpen ? keys : [])}
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
  );

  if (groups.length === 0) {
    return (
      <div className="space-y-3">
        {toolbar}
        <Card className="border rounded-md!">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ListChecks />
              </EmptyMedia>
              <EmptyTitle>
                {filter === "done" && !filtered
                  ? "Nothing done yet"
                  : EMPTY_TITLES[filtered ?? "none"]}
              </EmptyTitle>
              {filter !== "done" ? (
                <EmptyDescription>
                  Add what needs doing, on its own or for a project or task.
                </EmptyDescription>
              ) : null}
            </EmptyHeader>
            {filter !== "done" ? (
              <EmptyContent>
                <Button className="cursor-pointer" onClick={onCreate}>
                  <Plus data-icon="inline-start" /> New to-do
                </Button>
              </EmptyContent>
            ) : null}
          </Empty>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {toolbar}
      <Card className="border rounded-md! py-0">
        <Accordion
          multiple
          className="px-4"
          value={keys.filter((k) => !closed.includes(k))}
          onValueChange={(v) =>
            setClosed(keys.filter((k) => !(v as string[]).includes(k)))
          }
        >
          {groups.map((g) => {
            const link = groupLink(g);
            return (
              <AccordionItem key={g.key} value={g.key}>
                <AccordionTrigger className="cursor-pointer items-center gap-2 py-3 hover:no-underline sm:gap-3">
                  {g.project?.id ? (
                    <ProjectIcon
                      project={{ id: g.project.id }}
                      className="size-5 rounded-md"
                    />
                  ) : null}
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    <GroupName group={g} />
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {g.openCount} open
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-3 [&_a]:no-underline [&_p:not(:last-child)]:mb-0">
                  <div className="ml-2 border-l-2 pl-3 sm:ml-2.5 sm:pl-4">
                    {g.todos.length > 0 ? (
                      <div className="divide-y">
                        {g.todos.map((t) => (
                          <TodoRow
                            key={t.id}
                            todo={t}
                            timeZone={timeZone}
                            showLink={{ project: false, task: false }}
                            onToggled={(todo) =>
                              setKeep((k) => new Set(k).add(todo.id))
                            }
                          />
                        ))}
                      </div>
                    ) : null}
                    {link && filter !== "done" ? (
                      <div className="pt-2">
                        <TodoAddInput link={link} />
                      </div>
                    ) : null}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </Card>
    </div>
  );
}

/** General, a project's name, or "Project · Task"; a deleted one with the deleted marker. */
function GroupName({ group }: { group: TodoGroup }) {
  if (group.key === "general") return <>General</>;
  const part = (ref: TodoGroup["project"]) =>
    ref && !ref.id ? <DeletedName title={ref.title} /> : <>{ref?.title}</>;
  return (
    <>
      {group.project ? part(group.project) : null}
      {group.project && group.task ? (
        <>
          {" "}
          <span className="text-muted-foreground">·</span>{" "}
        </>
      ) : null}
      {group.task ? part(group.task) : null}
    </>
  );
}
