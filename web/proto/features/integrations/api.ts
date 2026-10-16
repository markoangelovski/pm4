import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult
} from "@tanstack/react-query";
import { apiClient } from "@/proto/mock/client";
import { unwrap, unwrapVoid } from "@/lib/api/problem";
import type {
  PmspaConnectionDto,
  PmspaDayDto,
  PmspaImportDto,
  PmspaImportSelectionDto,
  PmspaLinkDetailDto,
  PmspaLinkDto,
  PmspaLinkType,
  PmspaProjectDto,
  PmspaPushDto,
  PmspaPushTargetDto,
  PmspaSyncDto,
  PmspaSyncTargetDto,
  PmspaTaskDto,
  SavePmspaConnectionDto,
  SyncPreviewDto,
  SyncResultDto
} from "./proposed-types";

export type PmspaConnection = PmspaConnectionDto;

export const integrationKeys = {
  all: ["integrations"] as const,
  pmspa: () => [...integrationKeys.all, "pmspa"] as const,
  connection: () => [...integrationKeys.pmspa(), "connection"] as const,
  links: () => [...integrationKeys.pmspa(), "links"] as const,
  linksOf: (type: PmspaLinkType) => [...integrationKeys.links(), type] as const,
  link: (type: PmspaLinkType, id: string) =>
    [...integrationKeys.links(), type, id] as const,
  /** Live PMSPA reads (projects, tasks, days): refetched after an import or push. */
  remote: () => [...integrationKeys.pmspa(), "remote"] as const,
  projects: () => [...integrationKeys.remote(), "projects"] as const,
  tasks: (projectId: string) =>
    [...integrationKeys.remote(), "tasks", projectId] as const,
  days: (from: string, to: string) =>
    [...integrationKeys.remote(), "days", from, to] as const
};

/** Imports change PM4 records: their lists, details and logs refetch. */
const PM4_KEYS = [["projects"], ["tasks"], ["time"], ["bookings"]] as const;

/** API-INT-001. The sidebar, the settings tab and every push button read it. */
export function usePmspaConnection(): UseQueryResult<PmspaConnection> {
  return useQuery({
    queryKey: integrationKeys.connection(),
    queryFn: async ({ signal }) =>
      unwrap(await apiClient.GET("/api/v1/integrations/pmspa", { signal }))
  });
}

/** API-INT-002. A 409 `pmspa-account-switch` asks for confirmation (FR-INT-002); the caller resends with it. */
export function useSavePmspaConnection(): UseMutationResult<
  PmspaConnection,
  Error,
  SavePmspaConnectionDto
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SavePmspaConnectionDto) =>
      unwrap(
        await apiClient.PUT("/api/v1/integrations/pmspa", { body: input })
      ),
    onSuccess: (connection) => {
      queryClient.setQueryData(integrationKeys.connection(), connection);
      // Another account or links dropped: flags and PMSPA reads change.
      void queryClient.invalidateQueries({ queryKey: integrationKeys.links() });
      void queryClient.invalidateQueries({
        queryKey: integrationKeys.remote()
      });
    }
  });
}

/** API-INT-003. */
export function useTestPmspaConnection(): UseMutationResult<
  PmspaConnection,
  Error,
  void
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      unwrap(await apiClient.POST("/api/v1/integrations/pmspa/test")),
    onSuccess: (connection) => {
      queryClient.setQueryData(integrationKeys.connection(), connection);
      void queryClient.invalidateQueries({
        queryKey: integrationKeys.remote()
      });
    }
  });
}

/** API-INT-004. The links stay but go inactive, so the flags hide (FR-INT-005). */
export function useDisconnectPmspa(): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      unwrapVoid(await apiClient.DELETE("/api/v1/integrations/pmspa")),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: integrationKeys.remote() });
      return queryClient.invalidateQueries({
        queryKey: integrationKeys.pmspa()
      });
    }
  });
}

/**
 * API-INT-012: the active links of one type, for the sync flags (FR-INT-010). One request per type serves
 * every flag on a screen. Disabled without a saved connection (no flags then).
 */
export function usePmspaLinks(
  type: PmspaLinkType
): UseQueryResult<Map<string, PmspaLinkDto>> {
  const { data: connection } = usePmspaConnection();
  return useQuery({
    queryKey: integrationKeys.linksOf(type),
    queryFn: async ({ signal }) => {
      const { items } = unwrap(
        await apiClient.GET("/api/v1/integrations/pmspa/links", {
          params: { query: { type } },
          signal
        })
      );
      return new Map(items.map((l) => [l.pm4Id, l]));
    },
    enabled: connection !== undefined && connection.status !== "not-configured"
  });
}

/**
 * API-INT-014: one link with its PMSPA counterpart, read live from PMSPA. Only while `enabled` (the edit
 * dialog of a linked log is open). `staleTime` (spec reason): every PM4 user shares PMSPA's 100 requests per
 * 15 minutes, so reopening the dialog within 5 minutes reuses the answer, and a failed read isn't retried (OQ-164).
 */
export function usePmspaLinkDetail(
  type: PmspaLinkType,
  id: string,
  enabled: boolean
): UseQueryResult<PmspaLinkDetailDto> {
  return useQuery({
    queryKey: integrationKeys.link(type, id),
    queryFn: async ({ signal }) =>
      unwrap(
        await apiClient.GET("/api/v1/integrations/pmspa/links/{type}/{id}", {
          params: { path: { type, id } },
          signal
        })
      ),
    enabled,
    staleTime: 5 * 60_000,
    retry: false
  });
}

/** API-INT-013. Both records stay. */
export function useUnlink(): UseMutationResult<
  void,
  Error,
  { type: PmspaLinkType; id: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ type, id }) =>
      unwrapVoid(
        await apiClient.DELETE("/api/v1/integrations/pmspa/links/{type}/{id}", {
          params: { path: { type, id } }
        })
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: integrationKeys.pmspa() })
  });
}

/** API-INT-005: the connected account's PMSPA projects, read live. */
export function usePmspaProjects(
  enabled: boolean
): UseQueryResult<PmspaProjectDto[]> {
  return useQuery({
    queryKey: integrationKeys.projects(),
    queryFn: async ({ signal }) =>
      unwrap(
        await apiClient.GET("/api/v1/integrations/pmspa/projects", { signal })
      ).items,
    enabled
  });
}

/** API-INT-006: one PMSPA project's tasks, loaded when its row opens. */
export function usePmspaTasks(
  projectId: string,
  enabled: boolean
): UseQueryResult<PmspaTaskDto[]> {
  return useQuery({
    queryKey: integrationKeys.tasks(projectId),
    queryFn: async ({ signal }) =>
      unwrap(
        await apiClient.GET("/api/v1/integrations/pmspa/projects/{id}/tasks", {
          params: { path: { id: projectId } },
          signal
        })
      ).items,
    enabled
  });
}

/** API-INT-007: PMSPA days of a range with their events. */
export function usePmspaDays(
  from: string,
  to: string,
  enabled: boolean
): UseQueryResult<PmspaDayDto[]> {
  return useQuery({
    queryKey: integrationKeys.days(from, to),
    queryFn: async ({ signal }) =>
      unwrap(
        await apiClient.GET("/api/v1/integrations/pmspa/days", {
          params: { query: { from, to } },
          signal
        })
      ).items,
    enabled
  });
}

function refreshAfterSync(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: integrationKeys.pmspa() });
  for (const queryKey of PM4_KEYS)
    void queryClient.invalidateQueries({ queryKey });
}

/** API-INT-008: nothing is written (design principle 6). */
export function useImportPreview(): UseMutationResult<
  SyncPreviewDto,
  Error,
  PmspaImportSelectionDto
> {
  return useMutation({
    mutationFn: async (selection: PmspaImportSelectionDto) =>
      unwrap(
        await apiClient.POST("/api/v1/integrations/pmspa/import/preview", {
          body: selection
        })
      )
  });
}

/** API-INT-009. Per-record outcomes (design principle 9). */
export function useImport(): UseMutationResult<
  SyncResultDto,
  Error,
  PmspaImportDto
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PmspaImportDto) =>
      unwrap(
        await apiClient.POST("/api/v1/integrations/pmspa/import", {
          body: input
        })
      ),
    onSuccess: () => refreshAfterSync(queryClient)
  });
}

/** API-INT-015: a project or task, both ways (OQ-172, OQ-173). Nothing is written (design principle 6). */
export function useSyncPreview(): UseMutationResult<
  SyncPreviewDto,
  Error,
  PmspaSyncTargetDto
> {
  return useMutation({
    mutationFn: async (target: PmspaSyncTargetDto) =>
      unwrap(
        await apiClient.POST("/api/v1/integrations/pmspa/sync/preview", {
          body: target
        })
      )
  });
}

/** API-INT-016. Per-record outcomes (design principle 9). */
export function useSync(): UseMutationResult<
  SyncResultDto,
  Error,
  PmspaSyncDto
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PmspaSyncDto) =>
      unwrap(
        await apiClient.POST("/api/v1/integrations/pmspa/sync", {
          body: input
        })
      ),
    onSuccess: () => refreshAfterSync(queryClient)
  });
}

/** API-INT-010: a day's logs to PMSPA. */
export function usePushPreview(): UseMutationResult<
  SyncPreviewDto,
  Error,
  PmspaPushTargetDto
> {
  return useMutation({
    mutationFn: async (target: PmspaPushTargetDto) =>
      unwrap(
        await apiClient.POST("/api/v1/integrations/pmspa/push/preview", {
          body: target
        })
      )
  });
}

/** API-INT-011. */
export function usePush(): UseMutationResult<
  SyncResultDto,
  Error,
  PmspaPushDto
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PmspaPushDto) =>
      unwrap(
        await apiClient.POST("/api/v1/integrations/pmspa/push", {
          body: input
        })
      ),
    onSuccess: () => refreshAfterSync(queryClient)
  });
}
