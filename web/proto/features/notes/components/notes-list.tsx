"use client";

import { NotebookPen, Plus } from "lucide-react";
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
import { ProjectIcon } from "@/proto/features/projects/components/project-icon";
import {
  NOTE_PAGE_SIZE,
  useNotes,
  type NoteFilter,
  type NoteListOptions
} from "../api";
import { NoteItem } from "./note-item";

const EMPTY_TITLES = {
  search: "No notes match your search",
  range: "No notes in this time range",
  project: "No notes for this project",
  general: "No general notes",
  none: "No notes yet"
};

/** The Notes tab: notes in the toolbar's order, one card below the other (a stripe in its project's colours, grey for General), NOTE_PAGE_SIZE per page. */
export function NotesList({
  filter,
  options,
  filtered,
  page,
  onPage,
  timeZone,
  onCreate
}: {
  filter: NoteFilter;
  options: NoteListOptions;
  /** What narrows the list, for the empty state. */
  filtered: "search" | "range" | "project" | "general" | null;
  page: number;
  onPage: (page: number) => void;
  timeZone: string;
  onCreate: () => void;
}) {
  const query = useNotes(filter, page, NOTE_PAGE_SIZE, options);
  const data = query.data;
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / NOTE_PAGE_SIZE));

  if (query.isError) {
    return (
      <Card className="border rounded-md!">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Couldn&apos;t load the notes.</EmptyTitle>
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
  if (!data) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (data.total === 0) {
    return (
      <Card className="border rounded-md!">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <NotebookPen />
            </EmptyMedia>
            <EmptyTitle>{EMPTY_TITLES[filtered ?? "none"]}</EmptyTitle>
            <EmptyDescription>
              Keep ideas, decisions and details in one place.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button className="cursor-pointer" onClick={onCreate}>
              <Plus data-icon="inline-start" /> New note
            </Button>
          </EmptyContent>
        </Empty>
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      <div className="space-y-5">
        {data.items.map((n) => (
          <Card
            key={n.id}
            className="relative border rounded-md! py-2 pr-5 pl-7 shadow-sm"
          >
            {n.project?.id ? (
              <ProjectIcon
                project={{ id: n.project.id }}
                className="absolute inset-y-0 left-0 size-auto w-1.5 rounded-none"
              />
            ) : (
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-1.5 bg-muted-foreground/25"
              />
            )}
            <NoteItem note={n} timeZone={timeZone} />
          </Card>
        ))}
      </div>
      {pageCount > 1 ? (
        <div className="flex items-center justify-end gap-2 text-sm">
          <span className="text-muted-foreground">
            Page {page} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            className="cursor-pointer"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => onPage(page + 1)}
            className="cursor-pointer"
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
