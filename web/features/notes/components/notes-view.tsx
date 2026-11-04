"use client";

import { useMemo, useState } from "react";
import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates
} from "nuqs";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseRange } from "@/features/dashboard/range";
import { useProjects } from "@/features/projects/api";
import { useMe } from "@/features/users/api";
import { today as todayIn } from "@/lib/time";
import { useTodos } from "../api";
import { NOTE_SORTS, TODO_SORTS, type NoteSort, type TodoSort } from "../types";
import { NO_LINK, type NoteLink } from "../schemas";
import { ALL, UNLINKED } from "./notes-filter";
import { NoteFormDialog } from "./note-form-dialog";
import { NotesList } from "./notes-list";
import { NotesToolbar } from "./notes-toolbar";
import { TodoFormDialog } from "./todo-form-dialog";
import { TodosBoard } from "./todos-board";

const TABS = ["notes", "todos"] as const;
type Tab = (typeof TABS)[number];

/** Each tab's filter and sort when the URL has none: Notes shows General, title A–Z; To-dos all, by parent. */
const DEFAULTS = {
  notes: { show: UNLINKED, sort: "title:asc" },
  todos: { show: ALL, sort: "parent:asc" }
} as const satisfies Record<Tab, { show: string; sort: NoteSort | TodoSort }>;

const isNoteSort = (v: string | null): v is NoteSort =>
  (NOTE_SORTS as readonly (string | null)[]).includes(v);
const isTodoSort = (v: string | null): v is TodoSort =>
  (TODO_SORTS as readonly (string | null)[]).includes(v);

/**
 * The Notes page (`/app/notes?tab=…`): Notes and To-dos tabs, the New button. One toolbar serves both tabs, its
 * state in `show` (General, All or a project; the default is the tab's), `q`, `sort` (the tab's sorts),
 * `from`/`to` (absent: All time); the Notes tab also has `page`. Switching tabs resets `show` and `sort`.
 */
export function NotesView() {
  const [
    { tab, show: showParam, q, sort: sortParam, from, to, page },
    setParams
  ] = useQueryStates(
    {
      tab: parseAsStringLiteral(TABS).withDefault("notes"),
      show: parseAsString,
      q: parseAsString.withDefault(""),
      sort: parseAsString,
      from: parseAsString,
      to: parseAsString,
      page: parseAsInteger.withDefault(1)
    },
    { history: "replace", clearOnDefault: true }
  );
  const defaults = DEFAULTS[tab];
  const show = showParam ?? defaults.show;
  const noteSort: NoteSort =
    tab === "notes" && isNoteSort(sortParam) ? sortParam : DEFAULTS.notes.sort;
  const todoSort: TodoSort =
    tab === "todos" && isTodoSort(sortParam) ? sortParam : DEFAULTS.todos.sort;
  const me = useMe();
  const timeZone = me.data?.timeZone ?? "UTC";
  const today = todayIn(timeZone);
  // No dates in the URL: All time. Invalid ones fall back to This month, as on Statistics.
  const range = useMemo(
    () => (from || to ? parseRange(from, to, today) : null),
    [from, to, today]
  );
  const projects = useProjects({
    q: "",
    sort: "title:asc",
    page: 1,
    pageSize: 100
  });
  const options = (projects.data?.items ?? []).map((p) => ({
    key: p.id,
    project: { id: p.id, title: p.title, deleted: false }
  }));
  // An unknown project id in `show` falls back to the tab's default.
  const shown =
    show === ALL || show === UNLINKED
      ? null
      : (options.find((o) => o.key === show) ?? null);
  const showValue = shown
    ? shown.key
    : show === ALL || show === UNLINKED
      ? show
      : defaults.show;
  const noteFilter = shown
    ? { projectId: shown.key }
    : showValue === UNLINKED
      ? { unlinked: true }
      : {};
  const listOptions = { q: q || undefined, sort: noteSort, ...range };
  // Parent A–Z groups on the page; in a group, the oldest to-do first.
  const todoOptions = {
    q: q || undefined,
    sort: todoSort === "parent:asc" ? "createdAt:asc" : todoSort,
    ...range
  } as const;
  const filtered = q
    ? "search"
    : range
      ? "range"
      : shown
        ? "project"
        : showValue === UNLINKED
          ? "general"
          : null;
  // A new item from a filtered tab starts on its project.
  const preset: NoteLink = shown
    ? { project: { id: shown.key, title: shown.project.title }, task: null }
    : NO_LINK;
  const todos = useTodos(noteFilter, todoOptions);
  // The tab's count: every open to-do, whatever the toolbar shows.
  const allTodos = useTodos({});
  const openTodos = (allTodos.data ?? []).filter((t) => !t.doneAt).length;
  const [creating, setCreating] = useState<Tab | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
        <Button className="cursor-pointer" onClick={() => setCreating(tab)}>
          <Plus data-icon="inline-start" />
          {tab === "notes" ? "New note" : "New to-do"}
        </Button>
      </div>
      <Tabs
        className="gap-3"
        value={tab}
        onValueChange={(v) =>
          setParams({ tab: v as Tab, show: null, sort: null, page: null })
        }
      >
        <div className="border-b">
          <TabsList variant="line" className="h-11 justify-start">
            <TabsTrigger
              value="notes"
              className="flex-none cursor-pointer px-3"
            >
              Notes
            </TabsTrigger>
            <TabsTrigger
              value="todos"
              className="flex-none cursor-pointer px-3"
            >
              To-dos
              {openTodos > 0 ? (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">
                  {openTodos}
                </span>
              ) : null}
            </TabsTrigger>
          </TabsList>
        </div>
        <NotesToolbar
          noun={tab === "notes" ? "notes" : "to-dos"}
          q={q}
          onSearch={(text) => setParams({ q: text, page: null })}
          projects={options.map((o) => ({
            id: o.key,
            title: o.project.title
          }))}
          show={showValue}
          onShow={(v) =>
            setParams({ show: v === defaults.show ? null : v, page: null })
          }
          sort={tab === "notes" ? noteSort : todoSort}
          onSort={(v) =>
            setParams({ sort: v === defaults.sort ? null : v, page: null })
          }
          range={range}
          today={today}
          onRange={(r) =>
            setParams({
              from: r?.from ?? null,
              to: r?.to ?? null,
              page: null
            })
          }
        />
        <TabsContent value="notes">
          <NotesList
            filter={noteFilter}
            options={listOptions}
            filtered={filtered}
            page={Math.max(1, page)}
            onPage={(p) => setParams({ page: p === 1 ? null : p })}
            timeZone={timeZone}
            onCreate={() => setCreating("notes")}
          />
        </TabsContent>
        <TabsContent value="todos">
          <TodosBoard
            query={todos}
            filtered={filtered}
            byParent={todoSort === "parent:asc"}
            timeZone={timeZone}
            onCreate={() => setCreating("todos")}
          />
        </TabsContent>
      </Tabs>
      <NoteFormDialog
        open={creating === "notes"}
        onOpenChange={(o) => setCreating(o ? "notes" : null)}
        preset={preset}
      />
      <TodoFormDialog
        open={creating === "todos"}
        onOpenChange={(o) => setCreating(o ? "todos" : null)}
        preset={preset}
      />
    </div>
  );
}
