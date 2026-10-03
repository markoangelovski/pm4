"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { PrototypeStateSwitch } from "@/features/projects/components/prototype-state-switch";
import { TaskStatusBadges } from "@/features/projects/components/task-status-badges";
import {
  completionPercent,
  PROJECT_SORTS,
  useAllProjects,
  type Project,
  type ProjectSort
} from "@/features/projects/mock-store";
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

const VIEW_STATES = ["data", "loading", "empty", "error"] as const;
type ViewState = (typeof VIEW_STATES)[number];

function sortProjects(list: Project[], sort: ProjectSort): Project[] {
  const copy = [...list];
  if (sort === "title:asc")
    return copy.sort((a, b) => a.title.localeCompare(b.title));
  const key = sort === "createdAt:desc" ? "createdAt" : "updatedAt";
  return copy.sort((a, b) => b[key].localeCompare(a[key]));
}

/** SCR-020: the projects list. URL: `?q=&sort=&page=`. */
export function ProjectsList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const sortParam = searchParams.get("sort");
  const sort: ProjectSort = PROJECT_SORTS.includes(sortParam as ProjectSort)
    ? (sortParam as ProjectSort)
    : "updatedAt:desc";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  function setParams(next: { q?: string; sort?: ProjectSort; page?: number }) {
    const params = new URLSearchParams(searchParams.toString());
    const merged = { q, sort, page, ...next };
    if (merged.q) params.set("q", merged.q);
    else params.delete("q");
    if (merged.sort !== "updatedAt:desc") params.set("sort", merged.sort);
    else params.delete("sort");
    if (merged.page > 1) params.set("page", String(merged.page));
    else params.delete("page");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false
    });
  }

  const [text, setText] = useState(q);
  const debounced = useDebouncedValue(text.trim(), 300);
  useEffect(() => {
    if (debounced !== q) setParams({ q: debounced, page: 1 });
    // Only the debounced text drives the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const [viewState, setViewState] = useState<ViewState>("data");
  const [creating, setCreating] = useState(false);

  const all = useAllProjects();
  const { items, total } = useMemo(() => {
    const live = viewState === "empty" ? [] : all.filter((p) => !p.deletedAt);
    const needle = q.toLowerCase();
    const matched = needle
      ? live.filter((p) => p.title.toLowerCase().includes(needle))
      : live;
    const sorted = sortProjects(matched, sort);
    return {
      items: sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      total: sorted.length
    };
  }, [all, q, sort, page, viewState]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <PrototypeStateSwitch
        states={VIEW_STATES}
        value={viewState}
        onChange={setViewState}
      />

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
              placeholder="Search projects…"
              aria-label="Search projects"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </InputGroup>
          <Select
            items={SORT_ITEMS}
            value={sort}
            onValueChange={(value) => {
              if (value) setParams({ sort: value, page: 1 });
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

        {viewState === "error" ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Couldn&apos;t load projects.</EmptyTitle>
            </EmptyHeader>
            <EmptyContent>
              <Button
                variant="outline"
                onClick={() => setViewState("data")}
                className="cursor-pointer"
              >
                Retry
              </Button>
            </EmptyContent>
          </Empty>
        ) : viewState !== "loading" && total === 0 ? (
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
                  <TableHead className="pr-4">Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewState === "loading"
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
                        <TableCell className="pr-4">
                          <Skeleton className="h-4 w-32" />
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
                            <ProjectLeadLabel lead={project.lead} />
                          </TableCell>
                          <TableCell>
                            <TaskStatusBadges counts={project.taskCounts} />
                          </TableCell>
                          <TableCell className="pr-4">
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
                        </TableRow>
                      );
                    })}
              </TableBody>
            </Table>
          </div>
        )}

        {viewState === "data" && total > PAGE_SIZE ? (
          <div className="border-t p-3">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    aria-disabled={page <= 1}
                    className={
                      page <= 1 ? "pointer-events-none opacity-50" : undefined
                    }
                    onClick={(e) => {
                      e.preventDefault();
                      setParams({ page: page - 1 });
                    }}
                  />
                </PaginationItem>
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                  <PaginationItem key={n}>
                    <PaginationLink
                      href="#"
                      isActive={n === page}
                      onClick={(e) => {
                        e.preventDefault();
                        setParams({ page: n });
                      }}
                    >
                      {n}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    aria-disabled={page >= pageCount}
                    className={
                      page >= pageCount
                        ? "pointer-events-none opacity-50"
                        : undefined
                    }
                    onClick={(e) => {
                      e.preventDefault();
                      setParams({ page: page + 1 });
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
