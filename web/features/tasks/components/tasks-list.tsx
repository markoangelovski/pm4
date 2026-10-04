"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates
} from "nuqs";
import { ListTodo, Plus, SearchIcon, SearchX } from "lucide-react";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  projectKeys,
  useProjects,
  type ProjectList,
  type ProjectListParams
} from "@/features/projects/api";
import { ProjectIcon } from "@/features/projects/components/project-icon";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "@/features/tasks/status";
import { ProjectLeadLabel } from "@/features/users/components/project-lead-label";
import { DueDateBadge } from "@/features/tasks/components/due-date-badge";
import { ProjectPicker } from "@/features/tasks/components/project-picker";
import { TaskFormDialog } from "@/features/tasks/components/task-form-dialog";
import { TaskStatusSelect } from "@/features/tasks/components/task-status-select";
import { useTasks, TASK_SORTS, type TaskSort } from "@/features/tasks/api";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useMe } from "@/features/users/api";
import { formatShortDate } from "@/lib/time";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

/** The projects the project filter offers (the same query as `ProjectPicker`, so it's shared). */
const PROJECT_PICKER_PARAMS: ProjectListParams = {
  q: "",
  sort: "title:asc",
  page: 1,
  pageSize: 100
};

const SORT_LABELS: Record<TaskSort, string> = {
  "updatedAt:desc": "Recently updated",
  "dueDate:asc": "Due date",
  "title:asc": "Title A–Z"
};
const SORT_ITEMS = TASK_SORTS.map((value) => ({
  value,
  label: SORT_LABELS[value]
}));

/**
 * With `project`: the project page's Tasks section (no Project column or filter; "New task"
 * pre-selects it). Without: SCR-030 at `/app/tasks`.
 * URL: `?status=&q=&sort=&page=`, plus `?project=` on `/app/tasks`.
 */
export function TasksList({
  project
}: {
  project?: { id: string; title: string };
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const [params, setParams] = useQueryStates(
    {
      status: parseAsArrayOf(parseAsStringLiteral(TASK_STATUSES)).withDefault([
        ...TASK_STATUSES
      ]),
      q: parseAsString.withDefault(""),
      sort: parseAsStringLiteral(TASK_SORTS).withDefault("updatedAt:desc"),
      page: parseAsInteger.withDefault(1),
      project: parseAsString.withDefault("")
    },
    { history: "replace", clearOnDefault: true }
  );
  const { status, q, sort, page } = params;
  const projectId = project?.id ?? (params.project || undefined);

  const [text, setText] = useState(q);
  const debounced = useDebouncedValue(text.trim(), 300);
  useEffect(() => {
    if (debounced !== q) void setParams({ q: debounced, page: 1 });
    // Only the debounced text drives the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const [creating, setCreating] = useState(false);

  // Fetch tasks from the API.
  const query = useTasks({
    projectId,
    statuses: status,
    q,
    sort,
    page: Math.max(1, page),
    pageSize: PAGE_SIZE
  });
  const rows = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const showProject = !project;
  const filtered = Boolean(
    q !== "" ||
    status.length < TASK_STATUSES.length ||
    (showProject && params.project)
  );

  // SCR-030: "New task" pre-selects the filtered project. Read from the list the project
  // filter loaded, so the project page (no filter) never fetches it.
  const filterProject =
    showProject && params.project
      ? (queryClient
          .getQueryData<ProjectList>(projectKeys.list(PROJECT_PICKER_PARAMS))
          ?.items.find((p) => p.id === params.project) ?? null)
      : null;

  const newTaskButton = (
    <Button onClick={() => setCreating(true)} className="cursor-pointer">
      <Plus data-icon="inline-start" />
      New task
    </Button>
  );

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
      <div className="flex flex-wrap items-center gap-3">
        {showProject ? (
          <ProjectFilterPicker
            selectedProjectId={params.project}
            onProjectChange={(p) =>
              void setParams({ project: p?.id ?? "", page: 1 })
            }
          />
        ) : null}
        <ToggleGroup
          multiple
          variant="outline"
          size="sm"
          spacing={0}
          aria-label="Filter by status"
          value={status}
          onValueChange={(value) =>
            void setParams({
              status: TASK_STATUSES.filter((s) => value.includes(s)),
              page: 1
            })
          }
        >
          {TASK_STATUSES.map((s) => (
            <ToggleGroupItem
              key={s}
              value={s}
              className="cursor-pointer px-3 first:rounded-l-md! last:rounded-r-md! data-pressed:bg-muted"
            >
              {TASK_STATUS_LABELS[s]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <InputGroup className="w-full rounded-md! sm:w-60">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            placeholder="Search by title…"
            aria-label="Search tasks"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </InputGroup>
      </div>
      <Select
        items={SORT_ITEMS}
        value={sort}
        onValueChange={(value) => {
          if (value) void setParams({ sort: value, page: 1 });
        }}
      >
        <SelectTrigger aria-label="Sort" className="w-44 cursor-pointer">
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
  );

  let body: React.ReactNode;
  if (status.length === 0) {
    body = (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchX />
          </EmptyMedia>
          <EmptyTitle>No tasks match the filter</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  } else if (query.isError) {
    body = (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Couldn&apos;t load tasks.</EmptyTitle>
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
    );
  } else if (!query.isPending && total === 0) {
    if (filtered) {
      body = (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>No tasks match the filter</EmptyTitle>
          </EmptyHeader>
        </Empty>
      );
    } else {
      body = (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListTodo />
            </EmptyMedia>
            <EmptyTitle>No tasks yet</EmptyTitle>
            <EmptyDescription>
              Create a task to start tracking your work.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{newTaskButton}</EmptyContent>
        </Empty>
      );
    }
  } else if (query.isPending) {
    body = <TableSkeleton showProject={showProject} />;
  } else {
    body = (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Title</TableHead>
              {showProject ? <TableHead>Project</TableHead> : null}
              <TableHead>Status</TableHead>
              <TableHead>Due date</TableHead>
              <TableHead>Project lead</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="pr-4">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((task) => {
              const href = `${routes.app.task}?id=${task.id}`;
              return (
                <TableRow
                  key={task.id}
                  className="cursor-pointer"
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    // Links and the status control act on their own; the status menu is
                    // portaled, so its clicks aren't inside the row's DOM.
                    if (!e.currentTarget.contains(target)) return;
                    if (target.closest("a, button, [role=combobox]")) return;
                    if (window.getSelection()?.toString()) return;
                    router.push(href);
                  }}
                >
                  <TableCell className="max-w-96 pl-4">
                    <Link
                      href={href}
                      className={cn(
                        "block truncate font-medium hover:text-primary hover:underline",
                        task.status === "completed" &&
                          "text-muted-foreground line-through decoration-muted-foreground/50"
                      )}
                    >
                      {task.title}
                    </Link>
                  </TableCell>
                  {showProject ? (
                    <TableCell className="max-w-60">
                      <Link
                        href={`${routes.app.project}?id=${task.project.id}`}
                        className="flex min-w-0 items-center gap-2 hover:text-primary hover:underline"
                      >
                        <ProjectIcon
                          project={task.project}
                          className="size-4 rounded-sm"
                        />
                        <span className="truncate">{task.project.title}</span>
                      </Link>
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <TaskStatusSelect task={task} />
                  </TableCell>
                  <TableCell>
                    <DueDateBadge dueDate={task.dueDate} status={task.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <ProjectLeadLabel lead={task.projectLead} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {me ? (
                      formatShortDate(task.createdAt, me.timeZone)
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap pr-4">
                    {me ? (
                      formatShortDate(task.updatedAt, me.timeZone)
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
    );
  }

  const pagination =
    !query.isPending && total > PAGE_SIZE ? (
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
                  if (page > 1) void setParams({ page: page - 1 });
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
                  if (page < pageCount) void setParams({ page: page + 1 });
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    ) : null;

  const dialog = (
    <TaskFormDialog
      open={creating}
      onOpenChange={setCreating}
      defaultProject={project ?? filterProject ?? undefined}
    />
  );

  if (project) {
    return (
      <Card className="gap-0 p-0">
        <div className="flex items-center justify-between gap-4 border-b p-4">
          <h2 className="text-lg font-semibold">Tasks</h2>
          {newTaskButton}
        </div>
        {toolbar}
        {body}
        {pagination}
        {dialog}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Tasks</h1>
        {newTaskButton}
      </div>
      <Card className="gap-0 p-0">
        {toolbar}
        {body}
        {pagination}
      </Card>
      {dialog}
    </div>
  );
}

function TableSkeleton({ showProject }: { showProject: boolean }) {
  return (
    <div className="flex flex-col gap-4 p-4">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-6">
          <Skeleton className="h-4 w-56" />
          {showProject ? <Skeleton className="h-4 w-32" /> : null}
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

/**
 * Project filter picker for SCR-030 (tasks list without project prop).
 * Fetches all projects to find the selected one by ID.
 */
function ProjectFilterPicker({
  selectedProjectId,
  onProjectChange
}: {
  selectedProjectId: string;
  onProjectChange: (project: { id: string; title: string } | null) => void;
}) {
  const projects = useProjects(PROJECT_PICKER_PARAMS);
  const filterProject = selectedProjectId
    ? (projects.data?.items.find((p) => p.id === selectedProjectId) ?? null)
    : null;

  return (
    <ProjectPicker
      allowAll
      value={filterProject}
      onChange={onProjectChange}
      className="sm:w-56"
    />
  );
}
