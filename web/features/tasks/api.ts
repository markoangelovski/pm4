import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult
} from "@tanstack/react-query";
import { toast } from "sonner";
import { projectKeys } from "@/features/projects/api";
import { TASK_STATUSES, type TaskStatus } from "@/features/tasks/status";
import { apiClient } from "@/lib/api/client";
import { isApiError, unwrap, unwrapVoid } from "@/lib/api/problem";
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
  return useQuery({
    queryKey: taskKeys.list(params),
    queryFn: async ({ signal }) => {
      const { projectId, statuses, q, sort, page, pageSize } = params;
      const allStatuses = TASK_STATUSES.every((s) => statuses.includes(s));
      const query = {
        ...(projectId === undefined ? {} : { projectId }),
        ...(allStatuses ? {} : { status: statuses }),
        ...(q === "" ? {} : { q }),
        sort,
        page,
        pageSize
      };
      // D14: the API's `Ref.id` is nullable, but a task's project is always live.
      return unwrap(
        await apiClient.GET("/api/v1/tasks", {
          params: { query },
          signal
        })
      ) as TaskList;
    },
    placeholderData: keepPreviousData,
    enabled: params.statuses.length > 0
  });
}

/** API-TSK-003. No retry on ApiError 404; enabled defaults to true. */
export function useTask(
  id: string,
  enabled = true
): UseQueryResult<Task, Error> {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: async ({ signal }) =>
      unwrap(
        await apiClient.GET("/api/v1/tasks/{id}", {
          params: { path: { id } },
          signal
        })
      ) as Task,
    // The app default is one retry; a missing or trashed task won't appear on a retry.
    retry: (failureCount, error) => !isApiError(error, 404) && failureCount < 1,
    enabled
  });
}

/** API-TSK-001. onSuccess: invalidate lists(), projectKeys.detail(projectId), projectKeys.lists(). */
export function useCreateTask(): UseMutationResult<Task, Error, TaskInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TaskInput) =>
      unwrap(await apiClient.POST("/api/v1/tasks", { body: input })) as Task,
    onSuccess: (task) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: taskKeys.lists() }),
        queryClient.invalidateQueries({
          queryKey: projectKeys.detail(task.project.id)
        }),
        queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
      ])
  });
}

/** The task as cached: its detail, else the first cached list that holds it. */
function cachedTask(queryClient: QueryClient, id: string): Task | undefined {
  const detail = queryClient.getQueryData<Task>(taskKeys.detail(id));
  if (detail) return detail;
  for (const [, list] of queryClient.getQueriesData<TaskList>({
    queryKey: taskKeys.lists()
  })) {
    const found = list?.items.find((t) => t.id === id);
    if (found) return found;
  }
  return undefined;
}

/** API-TSK-004. onSuccess: setQueryData(detail); invalidate lists(), the old and new project details, projectKeys.lists(). */
export function useUpdateTask(
  id: string
): UseMutationResult<Task, Error, TaskInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TaskInput) =>
      unwrap(
        await apiClient.PATCH("/api/v1/tasks/{id}", {
          params: { path: { id } },
          body: input
        })
      ) as Task,
    onMutate: () => ({
      // The project before the save, so a move refreshes both projects' counts.
      oldProjectId: cachedTask(queryClient, id)?.project.id
    }),
    onSuccess: (task, _input, context) => {
      queryClient.setQueryData(taskKeys.detail(task.id), task);
      const projectIds = new Set([task.project.id]);
      if (context?.oldProjectId) projectIds.add(context.oldProjectId);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: taskKeys.lists() }),
        ...[...projectIds].map((projectId) =>
          queryClient.invalidateQueries({
            queryKey: projectKeys.detail(projectId)
          })
        ),
        queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
      ]);
    }
  });
}

/** Replaces one task in every cached task list, in place (D2). */
function patchTaskInLists(
  queryClient: QueryClient,
  id: string,
  patch: (task: Task) => Task
) {
  queryClient.setQueriesData<TaskList>(
    { queryKey: taskKeys.lists() },
    (list) =>
      list && list.items.some((t) => t.id === id)
        ? {
            ...list,
            items: list.items.map((t) => (t.id === id ? patch(t) : t))
          }
        : list
  );
}

/** API-TSK-004 `{status}`: optimistic, the row stays in place (D2, D5). */
export function useUpdateTaskStatus(): UseMutationResult<
  Task,
  Error,
  { task: Task; status: TaskStatus }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ task, status }: { task: Task; status: TaskStatus }) =>
      unwrap(
        await apiClient.PATCH("/api/v1/tasks/{id}", {
          params: { path: { id: task.id } },
          body: { status }
        })
      ) as Task,
    onMutate: async ({ task, status }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });
      const lists = queryClient.getQueriesData<TaskList>({
        queryKey: taskKeys.lists()
      });
      const detail = queryClient.getQueryData<Task>(taskKeys.detail(task.id));
      patchTaskInLists(queryClient, task.id, (t) => ({ ...t, status }));
      if (detail) {
        queryClient.setQueryData<Task>(taskKeys.detail(task.id), {
          ...detail,
          status
        });
      }
      return { lists, detail };
    },
    onError: (_error, { task }, context) => {
      if (context) {
        for (const [key, data] of context.lists) {
          queryClient.setQueryData(key, data);
        }
        if (context.detail) {
          queryClient.setQueryData(taskKeys.detail(task.id), context.detail);
        }
      }
      toast.error("Couldn't change the status.");
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(taskKeys.detail(saved.id), saved);
      patchTaskInLists(queryClient, saved.id, () => saved);
      // D5: stale, but not refetched now, so the row keeps its place.
      void queryClient.invalidateQueries({
        queryKey: taskKeys.lists(),
        refetchType: "none"
      });
      void queryClient.invalidateQueries({
        queryKey: projectKeys.detail(saved.project.id)
      });
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    }
  });
}

/** API-TSK-005. onSuccess: removeQueries(detail); invalidate lists(), projectKeys.detail(task.project.id), projectKeys.lists(). */
export function useDeleteTask(): UseMutationResult<void, Error, Task> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (task: Task) =>
      unwrapVoid(
        await apiClient.DELETE("/api/v1/tasks/{id}", {
          params: { path: { id: task.id } }
        })
      ),
    onSuccess: (_data, task) => {
      queryClient.removeQueries({ queryKey: taskKeys.detail(task.id) });
      // Not returned: the page must disable its detail query first (D12),
      // or the trashed task would 404 on a refetch.
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: projectKeys.detail(task.project.id)
      });
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    }
  });
}

/** API-TSK-006. onSuccess: invalidate detail(id), lists(), projectKeys.all. */
export function useRestoreTask(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrapVoid(
        await apiClient.POST("/api/v1/tasks/{id}/restore", {
          params: { path: { id } }
        })
      ),
    onSuccess: (_data, id) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: taskKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: projectKeys.all })
      ])
  });
}
