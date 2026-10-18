import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import type { components } from "@/lib/api/schema";
import {
  useDisconnectPmspa,
  useImport,
  useImportPreview,
  usePmspaConnection,
  usePmspaLinkDetail,
  usePmspaLinks,
  usePush,
  usePushPreview,
  useSavePmspaConnection,
  useSync,
  useSyncPreview
} from "./api";

type S = components["schemas"];

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  PUT: vi.fn(),
  POST: vi.fn(),
  DELETE: vi.fn()
}));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

const CONNECTION_KEY = ["integrations", "pmspa", "connection"];
const LINKS_KEY = ["integrations", "pmspa", "links", "task"];
const REMOTE_KEY = ["integrations", "pmspa", "remote", "projects"];
const PM4_KEYS = [
  ["projects", "list"],
  ["tasks", "detail", "t1"],
  ["time", "day", "2026-10-15"],
  ["bookings", "range"]
];

const connection = (
  over: Partial<S["PmspaConnectionResponseDto"]> = {}
): S["PmspaConnectionResponseDto"] => ({
  status: "connected",
  url: "https://pmspa.example.com",
  email: "me@example.com",
  account: {
    id: "u1",
    email: "me@example.com",
    avatarUrl: null,
    role: "user"
  },
  lastCheckedAt: "2026-10-15T20:00:00.000Z",
  lastSyncAt: null,
  rateLimit: null,
  ...over
});

const result: S["SyncResultDto"] = {
  items: [],
  syncedAt: "2026-10-15T20:50:00.000Z"
};
const preview: S["SyncPreviewDto"] = { items: [] };

const res = (status: number) => new Response(null, { status });
const ok = <T,>(data: T) => ({ data, response: res(200) });

function setup<T>(hook: () => T, seed?: (queryClient: QueryClient) => void) {
  const queryClient = createQueryClient();
  seed?.(queryClient);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, ...renderHook(hook, { wrapper }) };
}

const invalidated = (queryClient: QueryClient, key: readonly unknown[]) =>
  queryClient.getQueryState(key)?.isInvalidated;

/** Seeds the PMSPA and PM4 keys, so their invalidation (or not) can be observed. */
function seedAll(queryClient: QueryClient) {
  queryClient.setQueryData(LINKS_KEY, new Map());
  queryClient.setQueryData(REMOTE_KEY, []);
  for (const key of PM4_KEYS) queryClient.setQueryData(key, {});
}

const pathCalls = (mock: typeof api.GET, path: string) =>
  mock.mock.calls.filter(([p]) => p === path);

beforeEach(() => {
  vi.clearAllMocks();
  api.GET.mockImplementation(async (path: string) =>
    path === "/api/v1/integrations/pmspa" ? ok(connection()) : ok({ items: [] })
  );
});

describe("PMSPA connection hooks (feat-int-web)", () => {
  it("AC-1 FR-INT-001: usePmspaConnection, useSavePmspaConnection and useDisconnectPmspa call API-INT-001/002/004 with their keys and invalidations", async () => {
    const read = setup(() => usePmspaConnection());
    await waitFor(() => expect(read.result.current.isSuccess).toBe(true));
    expect(api.GET).toHaveBeenCalledWith(
      "/api/v1/integrations/pmspa",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(read.queryClient.getQueryData(CONNECTION_KEY)).toEqual(connection());

    const saved = connection({ email: "other@example.com" });
    api.PUT.mockResolvedValue(ok(saved));
    const body: S["SavePmspaConnectionDto"] = {
      url: "https://pmspa.example.com",
      email: "other@example.com",
      password: "secret"
    };
    const save = setup(() => useSavePmspaConnection(), seedAll);
    await act(() => save.result.current.mutateAsync(body));
    expect(api.PUT).toHaveBeenCalledWith("/api/v1/integrations/pmspa", {
      body
    });
    expect(save.queryClient.getQueryData(CONNECTION_KEY)).toEqual(saved);
    expect(invalidated(save.queryClient, LINKS_KEY)).toBe(true);
    expect(invalidated(save.queryClient, REMOTE_KEY)).toBe(true);

    api.DELETE.mockResolvedValue({ response: res(204) });
    const disconnect = setup(
      () => useDisconnectPmspa(),
      (queryClient) => {
        seedAll(queryClient);
        queryClient.setQueryData(CONNECTION_KEY, connection());
      }
    );
    await act(() => disconnect.result.current.mutateAsync());
    expect(api.DELETE).toHaveBeenCalledWith("/api/v1/integrations/pmspa");
    expect(disconnect.queryClient.getQueryState(REMOTE_KEY)).toBeUndefined();
    expect(invalidated(disconnect.queryClient, CONNECTION_KEY)).toBe(true);
    expect(invalidated(disconnect.queryClient, LINKS_KEY)).toBe(true);
  });

  it("AC-2 FR-INT-010: usePmspaLinks waits for a saved connection and returns a Map by pm4Id; usePmspaLinkDetail keeps 5 minutes and doesn't retry", async () => {
    const off = setup(
      () => usePmspaLinks("task"),
      (queryClient) =>
        queryClient.setQueryData(
          CONNECTION_KEY,
          connection({ status: "not-configured", url: null, email: null })
        )
    );
    await waitFor(() => expect(off.result.current.fetchStatus).toBe("idle"));
    expect(off.result.current.isPending).toBe(true);
    expect(pathCalls(api.GET, "/api/v1/integrations/pmspa/links")).toHaveLength(
      0
    );

    const link: S["PmspaLinkDto"] = {
      pm4Id: "t1",
      origin: "imported",
      syncedAt: "2026-10-15T20:50:00.000Z"
    };
    api.GET.mockImplementation(async (path: string) =>
      path === "/api/v1/integrations/pmspa"
        ? ok(connection({ status: "invalid-credentials" }))
        : ok({ items: [link] })
    );
    const on = setup(
      () => usePmspaLinks("task"),
      (queryClient) =>
        queryClient.setQueryData(
          CONNECTION_KEY,
          connection({ status: "invalid-credentials" })
        )
    );
    await waitFor(() => expect(on.result.current.isSuccess).toBe(true));
    expect(api.GET).toHaveBeenCalledWith(
      "/api/v1/integrations/pmspa/links",
      expect.objectContaining({ params: { query: { type: "task" } } })
    );
    expect(on.result.current.data).toBeInstanceOf(Map);
    expect(on.result.current.data?.get("t1")).toEqual(link);
    expect(on.queryClient.getQueryData(LINKS_KEY)).toBeInstanceOf(Map);

    api.GET.mockClear();
    api.GET.mockResolvedValue({
      error: {
        type: "https://pm4.angelovski.top/errors/internal",
        title: "Error",
        status: 500,
        detail: "Error."
      },
      response: res(500)
    });
    const detail = setup(() => usePmspaLinkDetail("task", "t1", true));
    await waitFor(() => expect(detail.result.current.isError).toBe(true));
    expect(api.GET).toHaveBeenCalledTimes(1);
    expect(api.GET).toHaveBeenCalledWith(
      "/api/v1/integrations/pmspa/links/{type}/{id}",
      expect.objectContaining({
        params: { path: { type: "task", id: "t1" } }
      })
    );
    const options = detail.queryClient
      .getQueryCache()
      .find({ queryKey: ["integrations", "pmspa", "links", "task", "t1"] })
      ?.options as { staleTime?: unknown; retry?: unknown } | undefined;
    expect(options?.staleTime).toBe(5 * 60_000);
    expect(options?.retry).toBe(false);
  });
});

describe("PMSPA import, sync and push hooks (feat-int-web)", () => {
  const commits = [
    {
      name: "useImport",
      hook: useImport,
      path: "/api/v1/integrations/pmspa/import",
      body: {
        selection: { projects: [{ id: "p1", taskIds: null }], dates: [] },
        choices: []
      } satisfies S["PmspaImportDto"]
    },
    {
      name: "useSync",
      hook: useSync,
      path: "/api/v1/integrations/pmspa/sync",
      body: {
        target: { type: "task", id: "t1" },
        choices: [{ key: "task:t1", kind: "skip" }]
      } satisfies S["PmspaSyncDto"]
    },
    {
      name: "usePush",
      hook: usePush,
      path: "/api/v1/integrations/pmspa/push",
      body: {
        target: { type: "day", id: "2026-10-15" },
        choices: []
      } satisfies S["PmspaPushDto"]
    }
  ] as const;

  const previews = [
    {
      name: "useImportPreview",
      hook: useImportPreview,
      path: "/api/v1/integrations/pmspa/import/preview",
      body: {
        projects: [{ id: "p1", taskIds: ["pt1"] }],
        dates: ["2026-10-15"]
      } satisfies S["PmspaImportSelectionDto"]
    },
    {
      name: "useSyncPreview",
      hook: useSyncPreview,
      path: "/api/v1/integrations/pmspa/sync/preview",
      body: { type: "project", id: "p1" } satisfies S["PmspaSyncTargetDto"]
    },
    {
      name: "usePushPreview",
      hook: usePushPreview,
      path: "/api/v1/integrations/pmspa/push/preview",
      body: { type: "day", id: "2026-10-15" } satisfies S["PmspaPushTargetDto"]
    }
  ] as const;

  it("AC-3 FR-INT-011: the commits POST their body and invalidate the PMSPA and PM4 keys; the previews POST and invalidate nothing", async () => {
    for (const { name, hook, path, body } of commits) {
      api.POST.mockClear();
      api.POST.mockResolvedValue(ok(result));
      const { result: r, queryClient } = setup(
        () =>
          hook() as unknown as {
            mutateAsync: (b: unknown) => Promise<unknown>;
          },
        seedAll
      );
      await act(() => r.current.mutateAsync(body));
      expect(api.POST, name).toHaveBeenCalledWith(path, { body });
      for (const key of [LINKS_KEY, REMOTE_KEY, ...PM4_KEYS])
        expect(invalidated(queryClient, key), `${name} ${key.join(",")}`).toBe(
          true
        );
    }

    for (const { name, hook, path, body } of previews) {
      api.POST.mockClear();
      api.POST.mockResolvedValue(ok(preview));
      const { result: r, queryClient } = setup(
        () =>
          hook() as unknown as {
            mutateAsync: (b: unknown) => Promise<unknown>;
          },
        seedAll
      );
      await expect(act(() => r.current.mutateAsync(body))).resolves.toEqual(
        preview
      );
      expect(api.POST, name).toHaveBeenCalledWith(path, { body });
      for (const key of [LINKS_KEY, REMOTE_KEY, ...PM4_KEYS])
        expect(invalidated(queryClient, key), `${name} ${key.join(",")}`).toBe(
          false
        );
    }
  });
});
