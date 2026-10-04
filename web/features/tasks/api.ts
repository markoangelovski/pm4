import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import type { TaskStatus } from "@/features/tasks/status";
import type { components } from "@/lib/api/schema";

type TaskResponse = components["schemas"]["TaskResponseDto"];
/** D14: a task's project is never purged, so its `Ref.id` is never null (endpoints.md *Task*). */
export type Task = Omit<TaskResponse, "project"> & {
  project: { id: string; title: string; deleted: boolean };
};
export type TaskList = Omit<
  components["schemas"]["TaskListResponseDto"],
  "items"
> & { items: Task[] };
export type ProjectRef = { id: string; title: string };

/** The sorts the UI offers. */
export const TASK_SORTS = [
  "updatedAt:desc",
  "dueDate:asc",
  "title:asc"
] as const;
export type TaskSort = (typeof TASK_SORTS)[number];

export interface TaskListParams {
  projectId?: string;
  statuses: TaskStatus[];
  q: string;
  sort: TaskSort;
  page: number;
  pageSize: number;
}

export interface TaskInput {
  projectId: string;
  title: string;
  description: string | null;
  externalLink: string | null;
  projectLeadUserId: string | null;
  projectLeadName: string | null;
  status: TaskStatus;
  dueDate: string | null;
}

export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (params: TaskListParams) => [...taskKeys.lists(), params] as const,
  details: () => [...taskKeys.all, "detail"] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const
};

/** API-TSK-002. statuses [] → disabled (no request); all three → no `status` param; q "" omitted. keepPreviousData. */
export function useTasks(
  params: TaskListParams
): UseQueryResult<TaskList, Error> {
  void params;
  throw new Error("not implemented (feat-tsk-web)");
}

/** API-TSK-003. No retry on ApiError 404; enabled defaults to true. */
export function useTask(
  id: string,
  enabled?: boolean
): UseQueryResult<Task, Error> {
  void id;
  void enabled;
  throw new Error("not implemented (feat-tsk-web)");
}

/** API-TSK-001. onSuccess: invalidate lists(), projectKeys.detail(projectId), projectKeys.lists(). */
export function useCreateTask(): UseMutationResult<Task, Error, TaskInput> {
  throw new Error("not implemented (feat-tsk-web)");
}

/** API-TSK-004. onSuccess: setQueryData(detail); invalidate lists(), the old and new project details, projectKeys.lists(). */
export function useUpdateTask(
  id: string
): UseMutationResult<Task, Error, TaskInput> {
  void id;
  throw new Error("not implemented (feat-tsk-web)");
}

/** API-TSK-004 `{status}`: optimistic, the row stays in place (D2, D5). */
export function useUpdateTaskStatus(): UseMutationResult<
  Task,
  Error,
  { task: Task; status: TaskStatus }
> {
  throw new Error("not implemented (feat-tsk-web)");
}

/** API-TSK-005. onSuccess: removeQueries(detail); invalidate lists(), projectKeys.detail(task.project.id), projectKeys.lists(). */
export function useDeleteTask(): UseMutationResult<void, Error, Task> {
  throw new Error("not implemented (feat-tsk-web)");
}

/** API-TSK-006. onSuccess: invalidate detail(id), lists(), projectKeys.all. */
export function useRestoreTask(): UseMutationResult<void, Error, string> {
  throw new Error("not implemented (feat-tsk-web)");
}
