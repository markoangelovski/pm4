import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { isApiError, unwrap, unwrapVoid } from "@/lib/api/problem";
import type { components } from "@/lib/api/schema";

export type Project = components["schemas"]["ProjectResponseDto"];
export type ProjectList = components["schemas"]["ProjectListResponseDto"];

/** The sorts the UI offers. */
export const PROJECT_SORTS = [
  "updatedAt:desc",
  "createdAt:desc",
  "title:asc"
] as const;
export type ProjectSort = (typeof PROJECT_SORTS)[number];

export interface ProjectListParams {
  q: string;
  sort: ProjectSort;
  page: number;
  pageSize: number;
}

export interface ProjectInput {
  title: string;
  description: string | null;
  externalLink: string | null;
  projectLeadUserId: string | null;
  projectLeadName: string | null;
}

export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (params: ProjectListParams) =>
    [...projectKeys.lists(), params] as const,
  details: () => [...projectKeys.all, "detail"] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const
};

/** Task queries live under this key (feat-tsk-web); a project's trash state changes them. */
const TASKS_KEY = ["tasks"] as const;

/** API-PRJ-002. q "" omitted from the request; placeholderData: keepPreviousData. */
export function useProjects(
  params: ProjectListParams
): UseQueryResult<ProjectList, Error> {
  return useQuery({
    queryKey: projectKeys.list(params),
    queryFn: async ({ signal }) => {
      const { q, sort, page, pageSize } = params;
      return unwrap(
        await apiClient.GET("/api/v1/projects", {
          params: {
            query:
              q === "" ? { sort, page, pageSize } : { q, sort, page, pageSize }
          },
          signal
        })
      );
    },
    placeholderData: keepPreviousData
  });
}

/** API-PRJ-003. No retry on ApiError 404 (D6); enabled defaults to true (D13). */
export function useProject(
  id: string,
  enabled = true
): UseQueryResult<Project, Error> {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async ({ signal }) =>
      unwrap(
        await apiClient.GET("/api/v1/projects/{id}", {
          params: { path: { id } },
          signal
        })
      ),
    // The app default is one retry; a missing or trashed project won't appear on a retry.
    retry: (failureCount, error) => !isApiError(error, 404) && failureCount < 1,
    enabled
  });
}

/** API-PRJ-001. onSuccess: setQueryData(detail), invalidate lists(). */
export function useCreateProject(): UseMutationResult<
  Project,
  Error,
  ProjectInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProjectInput) =>
      unwrap(await apiClient.POST("/api/v1/projects", { body: input })),
    onSuccess: (project) => {
      queryClient.setQueryData(projectKeys.detail(project.id), project);
      return queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    }
  });
}

/** API-PRJ-004 (all fields). onSuccess: setQueryData(detail), invalidate lists(). */
export function useUpdateProject(
  id: string
): UseMutationResult<Project, Error, ProjectInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProjectInput) =>
      unwrap(
        await apiClient.PATCH("/api/v1/projects/{id}", {
          params: { path: { id } },
          body: input
        })
      ),
    onSuccess: (project) => {
      queryClient.setQueryData(projectKeys.detail(project.id), project);
      return queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    }
  });
}

/** API-PRJ-005. onSuccess: removeQueries(detail(id)), invalidate lists() and ["tasks"]. */
export function useDeleteProject(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrapVoid(
        await apiClient.DELETE("/api/v1/projects/{id}", {
          params: { path: { id } }
        })
      ),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: projectKeys.detail(id) });
      // Not returned: the dialog's onDeleted must run right away to disable the
      // detail query, not after the lists refetch (the trashed project would 404).
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: TASKS_KEY });
    }
  });
}

/** API-PRJ-006. onSuccess: invalidate detail(id), lists() and ["tasks"]. */
export function useRestoreProject(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrapVoid(
        await apiClient.POST("/api/v1/projects/{id}/restore", {
          params: { path: { id } }
        })
      ),
    onSuccess: (_data, id) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: projectKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: TASKS_KEY })
      ])
  });
}
