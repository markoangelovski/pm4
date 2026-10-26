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
export type ProjectService = components["schemas"]["ProjectServiceDto"];

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
  services: string[];
}

export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (params: ProjectListParams) =>
    [...projectKeys.lists(), params] as const,
  details: () => [...projectKeys.all, "detail"] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  serviceNames: () => [...projectKeys.all, "service-names"] as const
};

/** Task queries live under this key (feat-tsk-web); deleting a project deletes its tasks. */
const TASKS_KEY = ["tasks"] as const;
/** Time queries live under this key (feat-tlog-web); their logs show a deleted project's name. */
const TIME_KEY = ["time"] as const;

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
    // The app default is one retry; a missing or deleted project won't appear on a retry.
    retry: (failureCount, error) => !isApiError(error, 404) && failureCount < 1,
    enabled
  });
}

/** API-PRJ-006: the service names on the user's projects (the Services field's suggestions). */
export function useServiceNames(): UseQueryResult<string[]> {
  return useQuery({
    queryKey: projectKeys.serviceNames(),
    queryFn: async ({ signal }) =>
      unwrap(await apiClient.GET("/api/v1/projects/service-names", { signal }))
        .items
  });
}

/** API-PRJ-001. onSuccess: setQueryData(detail), invalidate lists() and the service names. */
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
      void queryClient.invalidateQueries({
        queryKey: projectKeys.serviceNames()
      });
      return queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    }
  });
}

/** API-PRJ-004 (all fields). onSuccess: setQueryData(detail), invalidate lists(), the service names and ["tasks"] (a
 *  removed service leaves its tasks). */
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
      void queryClient.invalidateQueries({
        queryKey: projectKeys.serviceNames()
      });
      void queryClient.invalidateQueries({ queryKey: TASKS_KEY });
      return queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    }
  });
}

/** API-PRJ-005. onSuccess: removeQueries(detail(id)), invalidate lists(), the service names, ["tasks"] and ["time"]. */
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
      // detail query, not after the lists refetch (the deleted project would 404).
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: projectKeys.serviceNames()
      });
      void queryClient.invalidateQueries({ queryKey: TASKS_KEY });
      void queryClient.invalidateQueries({ queryKey: TIME_KEY });
    }
  });
}
