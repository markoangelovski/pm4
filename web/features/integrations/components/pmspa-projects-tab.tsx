"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronRight,
  FolderKanban,
  ListTodo,
  RefreshCw,
  SearchX,
  Search
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { useMe } from "@/features/users/api";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useLoadAllPmspaTasks, usePmspaProjects, usePmspaTasks } from "../api";
import type {
  PmspaProjectDto,
  PmspaRecordLinkDto,
  PmspaTaskDto
} from "../types";
import { pmspaProblemText, syncedLine } from "../sync";
import { PmspaProblemLine } from "./pmspa-problem-line";
import { ExpandAllButton } from "./expand-all-button";

/** Per selected PMSPA project: all its tasks, or the picked ones (none = the project alone, OQ-157). */
export type ProjectSelection = Map<
  string,
  { tasks: "all" | Set<string>; taskCount: number }
>;

const FILTERS = [
  { value: "all", label: "All" },
  { value: "linked", label: "Linked" },
  { value: "not-linked", label: "Not linked" }
] as const;
type Filter = (typeof FILTERS)[number]["value"];

/** FR-INT-007 / FR-INT-011: PMSPA projects, each opening to its tasks, with tri-state selection. */
export function PmspaProjectsTab({
  selection,
  onSelectionChange
}: {
  selection: ProjectSelection;
  onSelectionChange: (next: ProjectSelection) => void;
}) {
  const query = usePmspaProjects(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<Set<string>>(new Set());

  const projects = (query.data ?? []).filter(
    (p) =>
      p.title.toLowerCase().includes(q.trim().toLowerCase()) &&
      (filter === "all" || (filter === "linked") === (p.link !== null))
  );

  const expandable = projects.filter((p) => p.taskCount > 0);
  const allOpen =
    expandable.length > 0 && expandable.every((p) => open.has(p.id));
  const loadAll = useLoadAllPmspaTasks();
  /** **Expand all** reads every task once (OQ-201 (3)); the rows open when it's in, and stay closed if it fails. */
  const setAllOpen = (expand: boolean) => {
    if (!expand) return setOpen(new Set());
    const ids = expandable.map((p) => p.id);
    loadAll.mutate(ids, {
      onSuccess: () => setOpen(new Set(ids)),
      onError: (error) =>
        toast.error(pmspaProblemText(error) ?? "Couldn't read the tasks.")
    });
  };

  const toggleOpen = (id: string) =>
    setOpen((o) => {
      const next = new Set(o);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /** Every project shown, with all its tasks. */
  const allSelected =
    projects.length > 0 &&
    projects.every((p) => selection.get(p.id)?.tasks === "all");
  const toggleAll = () => {
    const next = new Map(selection);
    for (const p of projects) {
      if (allSelected) next.delete(p.id);
      else next.set(p.id, { tasks: "all", taskCount: p.taskCount });
    }
    onSelectionChange(next);
  };

  const toggleProject = (p: PmspaProjectDto) => {
    const next = new Map(selection);
    if (next.has(p.id)) next.delete(p.id);
    else next.set(p.id, { tasks: "all", taskCount: p.taskCount });
    onSelectionChange(next);
  };

  /** Ticking a task selects its project too (parents first). */
  const toggleTask = (
    p: PmspaProjectDto,
    t: PmspaTaskDto,
    all: PmspaTaskDto[]
  ) => {
    const next = new Map(selection);
    const current = next.get(p.id);
    const tasks =
      current === undefined
        ? new Set<string>()
        : current.tasks === "all"
          ? new Set(all.map((x) => x.id))
          : new Set(current.tasks);
    if (tasks.has(t.id)) tasks.delete(t.id);
    else tasks.add(t.id);
    next.set(p.id, {
      tasks: tasks.size === all.length ? "all" : tasks,
      taskCount: p.taskCount
    });
    onSelectionChange(next);
  };

  let content: React.ReactNode;
  if (query.isError) {
    content = (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Couldn&apos;t read your PMSPA projects.</EmptyTitle>
          <EmptyDescription>
            <PmspaProblemLine
              error={query.error}
              fallback="PMSPA may be unreachable."
            />
          </EmptyDescription>
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
    );
  } else if (!query.isPending && projects.length === 0) {
    content = query.data?.length ? (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchX />
          </EmptyMedia>
          <EmptyTitle>No PMSPA projects match</EmptyTitle>
        </EmptyHeader>
      </Empty>
    ) : (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderKanban />
          </EmptyMedia>
          <EmptyTitle>No projects in PMSPA</EmptyTitle>
          <EmptyDescription>
            Your PMSPA account has no projects to import.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  } else {
    const rows = query.isPending
      ? Array.from({ length: 5 }, (_, i) => (
          <TableRow key={i}>
            <TableCell className="pl-4">
              <Skeleton className="size-4" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-56" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-20" />
            </TableCell>
            <TableCell className="pr-4">
              <Skeleton className="h-4 w-28" />
            </TableCell>
          </TableRow>
        ))
      : projects.map((p) => (
          <ProjectRows
            key={p.id}
            project={p}
            open={open.has(p.id)}
            onToggleOpen={() => toggleOpen(p.id)}
            selected={selection.get(p.id)}
            onToggle={() => toggleProject(p)}
            onToggleTask={(t, all) => toggleTask(p, t, all)}
          />
        ));
    content = (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 pl-4">
                <Checkbox
                  aria-label="Select every project shown"
                  className="cursor-pointer"
                  disabled={query.isPending || projects.length === 0}
                  checked={allSelected}
                  indeterminate={
                    !allSelected && projects.some((p) => selection.has(p.id))
                  }
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>PMSPA project / task</TableHead>
              <TableHead className="w-40">Tasks / column</TableHead>
              <TableHead className="w-56 pr-4">In PM4</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{rows}</TableBody>
        </Table>
      </div>
    );
  }

  return (
    <Card className="gap-0 p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <InputGroup className="w-full rounded-md! sm:max-w-72">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            aria-label="Search PMSPA projects"
            placeholder="Search PMSPA projects…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </InputGroup>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            variant="outline"
            size="sm"
            spacing={0}
            aria-label="Show"
            value={[filter]}
            onValueChange={(v) => v[0] && setFilter(v[0] as Filter)}
          >
            {FILTERS.map((f) => (
              <ToggleGroupItem
                key={f.value}
                value={f.value}
                className="cursor-pointer px-3"
              >
                {f.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <ExpandAllButton
            size="sm"
            expanded={allOpen}
            disabled={
              query.isPending || loadAll.isPending || expandable.length === 0
            }
            onExpandedChange={setAllOpen}
          />
        </div>
      </div>
      {content}
    </Card>
  );
}

function ProjectRows({
  project,
  open,
  onToggleOpen,
  selected,
  onToggle,
  onToggleTask
}: {
  project: PmspaProjectDto;
  open: boolean;
  onToggleOpen: () => void;
  selected: { tasks: "all" | Set<string> } | undefined;
  onToggle: () => void;
  onToggleTask: (task: PmspaTaskDto, all: PmspaTaskDto[]) => void;
}) {
  const tasks = usePmspaTasks(project.id, open);
  const picked =
    selected === undefined
      ? 0
      : selected.tasks === "all"
        ? project.taskCount
        : selected.tasks.size;
  return (
    <Fragment>
      <TableRow
        data-state={selected ? "selected" : undefined}
        className="cursor-pointer"
        onClick={onToggleOpen}
      >
        <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            aria-label={`Select ${project.title}`}
            className="cursor-pointer"
            checked={selected !== undefined}
            indeterminate={selected !== undefined && picked < project.taskCount}
            onCheckedChange={onToggle}
          />
        </TableCell>
        <TableCell className="max-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <ChevronRight
              aria-hidden
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-90",
                project.taskCount === 0 && "invisible"
              )}
            />
            <FolderKanban
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground"
            />
            <span className="truncate font-medium" title={project.title}>
              {project.title}
            </span>
            {project.done ? (
              <Badge variant="secondary" className="shrink-0 font-normal">
                Done
              </Badge>
            ) : null}
          </div>
        </TableCell>
        <TableCell className="whitespace-nowrap text-muted-foreground">
          {selected
            ? `${picked} of ${project.taskCount} selected`
            : `${project.taskCount} ${project.taskCount === 1 ? "task" : "tasks"}`}
        </TableCell>
        <TableCell className="pr-4">
          <LinkCell link={project.link} href={routes.app.project} />
        </TableCell>
      </TableRow>
      {open ? (
        tasks.isPending ? (
          <TableRow>
            <TableCell />
            <TableCell colSpan={3} className="pl-13!">
              <Skeleton className="h-5 w-64" />
            </TableCell>
          </TableRow>
        ) : tasks.isError ? (
          <TableRow>
            <TableCell />
            <TableCell colSpan={3} className="pl-13! text-muted-foreground">
              Couldn&apos;t read the tasks.{" "}
              <Button
                variant="link"
                className="h-auto cursor-pointer p-0"
                onClick={() => void tasks.refetch()}
              >
                Retry
              </Button>
            </TableCell>
          </TableRow>
        ) : (
          (tasks.data ?? []).map((t) => {
            const on =
              selected !== undefined &&
              (selected.tasks === "all" || selected.tasks.has(t.id));
            return (
              <TableRow
                key={t.id}
                data-state={on ? "selected" : undefined}
                className="bg-muted/30"
              >
                <TableCell className="pl-4">
                  <Checkbox
                    aria-label={`Select ${t.title}`}
                    className="cursor-pointer"
                    checked={on}
                    onCheckedChange={() => onToggleTask(t, tasks.data ?? [])}
                  />
                </TableCell>
                <TableCell className="max-w-0 pl-13!">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <ListTodo
                      aria-hidden
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                    <span className="truncate" title={t.title}>
                      {t.title}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {t.column}
                </TableCell>
                <TableCell className="pr-4">
                  <LinkCell link={t.link} href={routes.app.task} />
                </TableCell>
              </TableRow>
            );
          })
        )
      ) : null}
    </Fragment>
  );
}

/** A linked record: the sync icon (with the last sync) and its PM4 counterpart; else "Not linked". */
function LinkCell({
  link,
  href
}: {
  link: PmspaRecordLinkDto | null;
  href: string;
}) {
  const { data: me } = useMe();
  if (!link) return <span className="text-muted-foreground">Not linked</span>;
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              tabIndex={0}
              className="inline-flex shrink-0 text-muted-foreground"
              aria-label="Linked"
            />
          }
        >
          <RefreshCw className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent>
          {me ? syncedLine(link.origin, link.syncedAt, me.timeZone) : "Linked"}
        </TooltipContent>
      </Tooltip>
      <Link
        href={`${href}?id=${link.pm4Id}`}
        onClick={(e) => e.stopPropagation()}
        className="truncate hover:text-primary hover:underline"
      >
        {link.pm4Title}
      </Link>
    </span>
  );
}
