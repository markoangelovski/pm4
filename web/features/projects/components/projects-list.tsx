"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates
} from "nuqs";
import { FolderKanban, Plus, SearchIcon, SearchX } from "lucide-react";
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
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from "@/components/ui/input-group";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { ProjectFormDialog } from "@/features/projects/components/project-form-dialog";
import { ProjectIcon } from "@/features/projects/components/project-icon";
import { ProjectLeadLabel } from "@/features/users/components/project-lead-label";
import { TaskStatusBadges } from "@/features/projects/components/task-status-badges";
import {
  PROJECT_SORTS,
  useProjects,
  type ProjectSort
} from "@/features/projects/api";
import { completionPercent } from "@/features/projects/stats";
import { useMe } from "@/features/users/api";
import { formatShortDate } from "@/lib/time";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { routes } from "@/lib/routes";

const PAGE_SIZE = 25;

const SORT_LABELS: Record<ProjectSort, string> = {
  "updatedAt:desc": "Recently updated",
  "createdAt:desc": "Recently created",
  "title:asc": "Title A–Z"
};
const SORT_ITEMS = PROJECT_SORTS.map((value) => ({
  value,
  label: SORT_LABELS[value]
}));

/** SCR-020: the projects list. URL: `?q=&sort=&page=`. */
export function ProjectsList() {
  const router = useRouter();
  const { data: me } = useMe();
  const [{ q, sort, page }, setParams] = useQueryStates(
    {
      q: parseAsString.withDefault(""),
      sort: parseAsStringLiteral(PROJECT_SORTS).withDefault("updatedAt:desc"),
      page: parseAsInteger.withDefault(1)
    },
    { history: "replace", clearOnDefault: true }
  );

  const [text, setText] = useState(q);
  const debounced = useDebouncedValue(text.trim(), 300);
  // Resync when q changes from outside (e.g. a sidebar link), not while typing:
  // our own URL updates make q equal the debounced text, so they are skipped.
  const [prevQ, setPrevQ] = useState(q);
  if (q !== prevQ) {
    setPrevQ(q);
    if (q !== debounced) setText(q);
  }
  useEffect(() => {
    if (debounced !== q) void setParams({ q: debounced, page: 1 });
    // Only the debounced text drives the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const [creating, setCreating] = useState(false);

  const query = useProjects({
    q,
    sort,
    page: Math.max(1, page),
    pageSize: PAGE_SIZE
  });
  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Button onClick={() => setCreating(true)} className="cursor-pointer">
          <Plus data-icon="inline-start" />
          New project
        </Button>
      </div>

      <Card className="gap-0 p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <InputGroup className="w-full rounded-md! sm:max-w-72">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              placeholder="Search by title or lead…"
              aria-label="Search projects"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </InputGroup>
          <Select
            items={SORT_ITEMS}
            value={sort}
            onValueChange={(value) => {
              if (value) void setParams({ sort: value, page: 1 });
            }}
          >
            <SelectTrigger aria-label="Sort" className="cursor-pointer w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_ITEMS.map((item) => (
                <SelectItem
                  key={item.value}
                  value={item.value}
                  className="cursor-pointer"
                >
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {query.isError ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Couldn&apos;t load projects.</EmptyTitle>
            </EmptyHeader>
            <EmptyContent>
              <Button
                variant="outline"
                onClick={() => void query.refetch()}
                className="cursor-pointer"
              >
                Retry
              </Button>
            </EmptyContent>
          </Empty>
        ) : !query.isPending && total === 0 ? (
          q ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchX />
                </EmptyMedia>
                <EmptyTitle>No projects match your search</EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FolderKanban />
                </EmptyMedia>
                <EmptyTitle>No projects yet</EmptyTitle>
                <EmptyDescription>
                  Create a project to start organising your tasks.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  onClick={() => setCreating(true)}
                  className="cursor-pointer"
                >
                  <Plus data-icon="inline-start" />
                  New project
                </Button>
              </EmptyContent>
            </Empty>
          )
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Title</TableHead>
                  <TableHead>Project lead</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="pr-4">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isPending
                  ? Array.from({ length: 6 }, (_, i) => (
                      <TableRow key={i}>
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-2.5">
                            <Skeleton className="size-6 rounded-md" />
                            <Skeleton className="h-4 w-48" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell className="pr-4">
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                      </TableRow>
                    ))
                  : items.map((project) => {
                      const percent = completionPercent(project.taskCounts);
                      const href = `${routes.app.project}?id=${project.id}`;
                      return (
                        <TableRow
                          key={project.id}
                          className="cursor-pointer"
                          onClick={(e) => {
                            // The title link navigates itself (and keeps keyboard and
                            // new-tab access); don't hijack a text selection.
                            if ((e.target as HTMLElement).closest("a")) return;
                            if (window.getSelection()?.toString()) return;
                            router.push(href);
                          }}
                        >
                          <TableCell className="max-w-80 pl-4">
                            <div className="flex items-center gap-2.5">
                              <ProjectIcon project={project} />
                              <Link
                                href={href}
                                className="min-w-0 truncate font-medium hover:text-primary hover:underline"
                              >
                                {project.title}
                              </Link>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <ProjectLeadLabel lead={project.projectLead} />
                          </TableCell>
                          <TableCell>
                            <TaskStatusBadges counts={project.taskCounts} />
                          </TableCell>
                          <TableCell>
                            <div className="flex min-w-36 items-center gap-3">
                              <Progress
                                value={percent}
                                aria-label="Completed"
                                className="w-24"
                              />
                              <span className="text-xs tabular-nums text-muted-foreground">
                                {percent} %
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {me ? (
                              formatShortDate(project.createdAt, me.timeZone)
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap pr-4">
                            {me ? (
                              formatShortDate(project.updatedAt, me.timeZone)
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
              </TableBody>
            </Table>
          </div>
        )}

        {!query.isPending && total > PAGE_SIZE ? (
          <div className="border-t p-3">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    role="link"
                    href="#"
                    aria-disabled={page <= 1}
                    className={
                      page <= 1 ? "pointer-events-none opacity-50" : undefined
                    }
                    onClick={(e) => {
                      e.preventDefault();
                      if (page <= 1) return;
                      void setParams({ page: page - 1 });
                    }}
                  />
                </PaginationItem>
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                  <PaginationItem key={n}>
                    <PaginationLink
                      role="link"
                      href="#"
                      isActive={n === page}
                      onClick={(e) => {
                        e.preventDefault();
                        void setParams({ page: n });
                      }}
                    >
                      {n}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    role="link"
                    href="#"
                    aria-disabled={page >= pageCount}
                    className={
                      page >= pageCount
                        ? "pointer-events-none opacity-50"
                        : undefined
                    }
                    onClick={(e) => {
                      e.preventDefault();
                      if (page >= pageCount) return;
                      void setParams({ page: page + 1 });
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        ) : null}
      </Card>

      <ProjectFormDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
