import { useEffect } from "react";
import {
  hashKey,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { unwrap, unwrapVoid } from "@/lib/api/problem";
import type {
  PmspaCandidatesDto,
  PmspaCandidatesInputDto,
  PmspaConnectionDto,
  PmspaDayDto,
  PmspaDaySummaryDto,
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
} from "./types";

/** The connection with its PMSPA `rateLimit` (API-INT-001). */
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
    [...integrationKeys.remote(), "days", from, to] as const,
  /** One day's events (API-INT-018); null when PMSPA no longer has events on it. */
  day: (date: string) => [...integrationKeys.remote(), "day", date] as const,
  /** **Link to existing** candidates (API-INT-019), per list and the PM4 records they're compared with. */
  candidates: (input: PmspaCandidatesInputDto) =>
    [
      ...integrationKeys.remote(),
      "candidates",
      input.type,
      input.type === "task" ? input.projectId : null,
      [...input.for].sort()
    ] as const
};

/**
 * Live PMSPA reads (OQ-201 (4)): every PM4 user shares PMSPA's 100 requests per 15 minutes, so an answer is
 * reused for 5 minutes, isn't read again on window focus, and a failed read isn't retried.
 */
const PMSPA_READ = {
  staleTime: 5 * 60_000,
  refetchOnWindowFocus: false,
  retry: false
} as const;

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

/**
 * PMSPA's rate limit on the connection is as fresh as the last PMSPA call: once the PMSPA reads and every
 * mutation have settled, the connection is read again (a PM4 read, PMSPA isn't called).
 */
export function useRefreshPmspaRateLimit(): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    // Cache listeners run synchronously, so a call that starts and settles between two renders is still seen.
    const count = () =>
      queryClient.isFetching({ queryKey: integrationKeys.remote() }) +
      queryClient.isMutating();
    let wasBusy = count() > 0;
    const onEvent = () => {
      const busy = count() > 0;
      const settled = wasBusy && !busy;
      // Set before invalidating: the invalidation emits cache events synchronously.
      wasBusy = busy;
      if (settled)
        void queryClient.invalidateQueries({
          queryKey: integrationKeys.connection(),
          exact: true
        });
    };
    const unsubscribeQueries = queryClient.getQueryCache().subscribe(onEvent);
    const unsubscribeMutations = queryClient
      .getMutationCache()
      .subscribe(onEvent);
    return () => {
      unsubscribeQueries();
      unsubscribeMutations();
    };
  }, [queryClient]);
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
 * dialog of a linked log is open). Reopening the dialog within 5 minutes reuses the answer (OQ-164, `PMSPA_READ`).
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
    ...PMSPA_READ
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
    enabled,
    ...PMSPA_READ
  });
}

/** API-INT-006: one PMSPA project's tasks, loaded when its row opens (unless **Expand all** filled it). */
export function usePmspaTasks(
  projectId: string,
  enabled: boolean
): UseQueryResult<PmspaTaskDto[]> {
  return useQuery({ ...pmspaTasksQuery(projectId), enabled });
}

/** API-INT-006's query, shared by a row that opens and **Expand all**'s per-project reads. */
const pmspaTasksQuery = (projectId: string) => ({
  queryKey: integrationKeys.tasks(projectId),
  queryFn: async ({ signal }: { signal?: AbortSignal }) =>
    unwrap(
      await apiClient.GET("/api/v1/integrations/pmspa/projects/{id}/tasks", {
        params: { path: { id: projectId } },
        signal
      })
    ).items,
  ...PMSPA_READ
});

/** A cached PMSPA read that is in and still fresh, so **Expand all** needn't read it again. */
function isFresh(queryClient: QueryClient, queryKey: readonly unknown[]) {
  const state = queryClient.getQueryState(queryKey);
  return (
    state?.status === "success" &&
    !state.isInvalidated &&
    Date.now() - state.dataUpdatedAt < PMSPA_READ.staleTime
  );
}

/** PMSPA requests a task list costs: it reads 50 tasks per page, and an empty list still takes one. */
const taskPages = (taskCount: number) => Math.max(1, Math.ceil(taskCount / 50));

/** A PMSPA project as **Expand all** weighs it: its id and how many tasks it has. */
export type PmspaTaskListSize = { id: string; taskCount: number };

/**
 * **Expand all** (OQ-206): fills the task list of each of `shown` with the cheaper read. Per project (API-INT-006)
 * costs `Σ⌈taskCount/50⌉` over the shown lists not cached and fresh; all tasks (API-INT-017) costs
 * `⌈Σ taskCount/50⌉` over every project in `all`, and then fills every one of their lists. A tie reads all tasks.
 * Nothing is read when every shown list is cached and fresh.
 */
export function useLoadAllPmspaTasks(): UseMutationResult<
  void,
  Error,
  { shown: PmspaTaskListSize[]; all: PmspaTaskListSize[] }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ shown, all }) => {
      const missing = shown.filter(
        (p) => !isFresh(queryClient, integrationKeys.tasks(p.id))
      );
      if (missing.length === 0) return;
      const perProject = missing.reduce(
        (n, p) => n + taskPages(p.taskCount),
        0
      );
      const allTasks = taskPages(all.reduce((n, p) => n + p.taskCount, 0));
      if (perProject < allTasks) {
        await Promise.all(
          missing.map((p) => queryClient.fetchQuery(pmspaTasksQuery(p.id)))
        );
        return;
      }
      const { items } = unwrap(
        await apiClient.GET("/api/v1/integrations/pmspa/tasks")
      );
      for (const p of all)
        queryClient.setQueryData(
          integrationKeys.tasks(p.id),
          items.filter((t) => t.projectId === p.id)
        );
    }
  });
}

/** Proposed API-INT-007: a week's PMSPA days from one range call: date, start and event count, no events. */
export function usePmspaDays(
  from: string,
  to: string,
  enabled: boolean
): UseQueryResult<PmspaDaySummaryDto[]> {
  return useQuery({
    queryKey: integrationKeys.days(from, to),
    queryFn: async ({ signal }) =>
      unwrap(
        await apiClient.GET("/api/v1/integrations/pmspa/days", {
          params: { query: { from, to } },
          signal
        })
      ).items,
    enabled,
    ...PMSPA_READ
  });
}

/** Proposed API-INT-018 for the given dates; a date PMSPA has no events for comes back null. */
async function readDayDetails(
  dates: string[],
  signal?: AbortSignal
): Promise<Map<string, PmspaDayDto | null>> {
  const { items } = unwrap(
    await apiClient.GET("/api/v1/integrations/pmspa/days/details", {
      params: { query: { dates } },
      signal
    })
  );
  return new Map(
    dates.map((d) => [d, items.find((day) => day.date === d) ?? null])
  );
}

/** One PMSPA day with its events, their tasks and projects: read when its row opens (unless **Expand all** filled it). */
export function usePmspaDay(
  date: string,
  enabled: boolean
): UseQueryResult<PmspaDayDto | null> {
  return useQuery({
    queryKey: integrationKeys.day(date),
    queryFn: async ({ signal }) =>
      (await readDayDetails([date], signal)).get(date) ?? null,
    enabled,
    ...PMSPA_READ
  });
}

/**
 * **Expand all** on the Time tab: one API-INT-018 read of every day of `dates` that isn't cached and fresh
 * (a task or project used on several days is read once), filling each day's query. Nothing is read when all are.
 */
export function useLoadPmspaDays(): UseMutationResult<void, Error, string[]> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dates: string[]) => {
      const missing = dates.filter(
        (d) => !isFresh(queryClient, integrationKeys.day(d))
      );
      if (missing.length === 0) return;
      for (const [date, day] of await readDayDetails(missing))
        queryClient.setQueryData(integrationKeys.day(date), day);
    }
  });
}

/**
 * Days an import read (its `days`) fill the Time tab's rows. A selected date it didn't answer (a future one isn't
 * read) is left as it was.
 */
function fillDays(queryClient: QueryClient, days: PmspaDayDto[] | undefined) {
  for (const day of days ?? [])
    queryClient.setQueryData(integrationKeys.day(day.date), day);
}

/** `filled`: days the answer brought, kept as they are instead of read again from PMSPA. */
function refreshAfterSync(queryClient: QueryClient, filled: string[] = []) {
  const keep = new Set(filled.map((d) => hashKey(integrationKeys.day(d))));
  void queryClient.invalidateQueries({
    queryKey: integrationKeys.pmspa(),
    predicate: (query) => !keep.has(query.queryHash)
  });
  for (const queryKey of PM4_KEYS)
    void queryClient.invalidateQueries({ queryKey });
}

/** API-INT-008: nothing is written (design principle 6). The days it read fill the Time tab's rows. */
export function useImportPreview(): UseMutationResult<
  SyncPreviewDto,
  Error,
  PmspaImportSelectionDto
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (selection: PmspaImportSelectionDto) =>
      unwrap(
        await apiClient.POST("/api/v1/integrations/pmspa/import/preview", {
          body: selection
        })
      ),
    onSuccess: (preview) => fillDays(queryClient, preview.days)
  });
}

/** API-INT-009. Per-record outcomes (design principle 9); the days it answers replace the Time tab's rows. */
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
    onSuccess: (result) => {
      refreshAfterSync(
        queryClient,
        (result.days ?? []).map((d) => d.date)
      );
      fillDays(queryClient, result.days);
    }
  });
}

/**
 * API-INT-015: a project or task, both ways (OQ-172, OQ-173). Nothing is written (design principle 6). Rows
 * whose PMSPA candidates weren't read have `candidates: null` (OQ-204, `usePmspaCandidates`).
 */
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

/**
 * API-INT-019 (OQ-204): the PMSPA records a sync or push row can link to, read only once its dropdown opens
 * (`input` null until then). One read serves every row of `input.for`; reused for 5 minutes (`PMSPA_READ`).
 */
export function usePmspaCandidates(
  input: PmspaCandidatesInputDto | null
): UseQueryResult<PmspaCandidatesDto> {
  return useQuery({
    queryKey: input
      ? integrationKeys.candidates(input)
      : [...integrationKeys.remote(), "candidates", null],
    queryFn: async ({ signal }) =>
      unwrap(
        await apiClient.POST("/api/v1/integrations/pmspa/candidates", {
          body: input!,
          signal
        })
      ),
    enabled: input !== null,
    ...PMSPA_READ
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

/** API-INT-010: a day's logs to PMSPA; event rows name their PMSPA project and task (`taskPath`). */
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
