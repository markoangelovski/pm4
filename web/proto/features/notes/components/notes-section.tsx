"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ListChecks,
  NotebookPen,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/proto/features/users/api";
import { useNotes, useTodos, type NoteFilter, type Todo } from "../api";
import { byOpenThenDone } from "../group";
import type { NoteLink } from "../schemas";
import { NoteFormDialog } from "./note-form-dialog";
import { NoteItem } from "./note-item";
import { TodoAddInput } from "./todo-add-input";
import { TodoRow } from "./todo-row";

/** Notes shown at first on a card, and how many more each Show more adds. */
const NOTES_FIRST = 3;
const NOTES_MORE = 10;
/** The most notes a card shows, however many Show more clicks. */
const NOTES_MAX = 100;

/**
 * The Notes and To-dos cards of a project's or task's page, side by side on wide screens. A project's cards include
 * its tasks' items (each names its task); new items are linked to the page's project or task.
 */
export function NotesSection({ link }: { link: NoteLink }) {
  const filter: NoteFilter = link.task
    ? { taskId: link.task.id }
    : { projectId: link.project?.id ?? "" };
  const hide = link.task ? "task" : "project";
  const me = useMe();
  const timeZone = me.data?.timeZone ?? "UTC";
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <NotesCard filter={filter} link={link} hide={hide} timeZone={timeZone} />
      <TodosCard filter={filter} link={link} hide={hide} timeZone={timeZone} />
    </div>
  );
}

function NotesCard({
  filter,
  link,
  hide,
  timeZone
}: {
  filter: NoteFilter;
  link: NoteLink;
  hide: "project" | "task";
  timeZone: string;
}) {
  const [limit, setLimit] = useState(NOTES_FIRST);
  const [creating, setCreating] = useState(false);
  const query = useNotes(filter, 1, limit);
  const data = query.data;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <NotebookPen className="size-4" /> Notes
          {data && data.total > 0 ? (
            <span className="text-sm font-normal text-muted-foreground tabular-nums">
              {data.total}
            </span>
          ) : null}
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer"
          onClick={() => setCreating(true)}
        >
          <Plus data-icon="inline-start" /> New note
        </Button>
      </CardHeader>
      <CardContent>
        {query.isError ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            Couldn&apos;t load the notes.
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => void query.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : !data ? (
          <Skeleton className="h-24 w-full" />
        ) : data.total === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          <>
            <div className="-mt-3 divide-y">
              {data.items.map((n) => (
                <NoteItem key={n.id} note={n} timeZone={timeZone} hide={hide} />
              ))}
            </div>
            {data.total > data.items.length && limit < NOTES_MAX ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={query.isFetching}
                className="mt-1 w-full cursor-pointer"
                onClick={() =>
                  setLimit((l) => Math.min(l + NOTES_MORE, NOTES_MAX))
                }
              >
                <ChevronDown data-icon="inline-start" />
                Show more ({data.total - data.items.length})
              </Button>
            ) : null}
          </>
        )}
      </CardContent>
      <NoteFormDialog
        open={creating}
        onOpenChange={setCreating}
        preset={link}
      />
    </Card>
  );
}

function TodosCard({
  filter,
  link,
  hide,
  timeZone
}: {
  filter: NoteFilter;
  link: NoteLink;
  hide: "project" | "task";
  timeZone: string;
}) {
  const query = useTodos(filter);
  const [showDone, setShowDone] = useState(false);
  // Ticked off here: stays among the open ones until the page is left (or Show done is used).
  const [keep, setKeep] = useState<Set<string>>(new Set());
  const todos = [...(query.data ?? [])].sort(byOpenThenDone);
  const open = todos.filter((t) => !t.doneAt || keep.has(t.id));
  const done = todos.filter((t) => t.doneAt && !keep.has(t.id));
  const openCount = todos.filter((t) => !t.doneAt).length;
  const row = (t: Todo) => (
    <TodoRow
      key={t.id}
      todo={t}
      timeZone={timeZone}
      showLink={{ project: false, task: hide === "project" }}
      onToggled={(todo) => setKeep((k) => new Set(k).add(todo.id))}
    />
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="size-4" /> To-dos
          {query.data ? (
            <span className="text-sm font-normal text-muted-foreground tabular-nums">
              {openCount} open
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {query.isError ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            Couldn&apos;t load the to-dos.
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => void query.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : !query.data ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            {open.length > 0 ? (
              <div className="-mt-2.5 divide-y">{open.map(row)}</div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {done.length > 0 ? "Everything is done." : "No to-dos yet."}
              </p>
            )}
            <TodoAddInput link={link} />
            {done.length > 0 ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full cursor-pointer"
                  onClick={() => {
                    setShowDone((s) => !s);
                    setKeep(new Set());
                  }}
                >
                  {showDone ? (
                    <ChevronUp data-icon="inline-start" />
                  ) : (
                    <ChevronDown data-icon="inline-start" />
                  )}
                  {showDone ? "Hide done" : `Show done (${done.length})`}
                </Button>
                {showDone ? (
                  <div className="divide-y">{done.map(row)}</div>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
