import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import type { components } from "@/lib/api/schema";

const NOT_IMPLEMENTED = "not implemented (feat-prj-web)";

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

/** API-PRJ-002. q "" omitted from the request; placeholderData: keepPreviousData. */
export function useProjects(
  params: ProjectListParams
): UseQueryResult<ProjectList, Error> {
  void params;
  throw new Error(NOT_IMPLEMENTED);
}

/** API-PRJ-003. No retry on ApiError 404 (D6); enabled defaults to true (D13). */
export function useProject(
  id: string,
  enabled?: boolean
): UseQueryResult<Project, Error> {
  void id;
  void enabled;
  throw new Error(NOT_IMPLEMENTED);
}

/** API-PRJ-001. onSuccess: setQueryData(detail), invalidate lists(). */
export function useCreateProject(): UseMutationResult<
  Project,
  Error,
  ProjectInput
> {
  throw new Error(NOT_IMPLEMENTED);
}

/** API-PRJ-004 (all fields). onSuccess: setQueryData(detail), invalidate lists(). */
export function useUpdateProject(
  id: string
): UseMutationResult<Project, Error, ProjectInput> {
  void id;
  throw new Error(NOT_IMPLEMENTED);
}

/** API-PRJ-005. onSuccess: removeQueries(detail(id)), invalidate lists() and ["tasks"]. */
export function useDeleteProject(): UseMutationResult<void, Error, string> {
  throw new Error(NOT_IMPLEMENTED);
}

/** API-PRJ-006. onSuccess: invalidate detail(id), lists() and ["tasks"]. */
export function useRestoreProject(): UseMutationResult<void, Error, string> {
  throw new Error(NOT_IMPLEMENTED);
}
