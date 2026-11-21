import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import { isApiError } from "@/lib/api/problem";
import {
  useAllowConsent,
  useConnectedApps,
  useConsentRequest,
  useDenyConsent,
  useRevokeConnectedApp,
  type ConnectedApp,
  type ConsentRequest
} from "./api";

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  DELETE: vi.fn()
}));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

const CONNECTED_APPS_KEY = ["agents", "connected-apps"] as const;

const consentRequest: ConsentRequest = {
  id: "abc",
  client: { name: "Claude Code", clientIdHost: "claude.ai" },
  redirectHost: "127.0.0.1:40000",
  loopback: true,
  scopes: ["pm4:read", "pm4:write"],
  existingGrant: null,
  expiresAt: "2026-11-21T10:10:00Z"
};

// `logoUri` joins the generated `ConnectedApp` type when T-0185 regenerates it; the intersection types both states.
const app: ConnectedApp & { logoUri: string | null } = {
  id: "g1",
  client: { name: "Claude Code", clientIdHost: "claude.ai" },
  scopes: ["pm4:read"],
  connectedAt: "2026-11-01T10:00:00Z",
  lastUsedAt: null,
  expired: false,
  logoUri: null
};

const res = (status: number) => new Response(null, { status });
const problem = (status: number) => ({
  type: `https://pm4.example/problems/${status}`,
  title: "Problem",
  status,
  detail: "Problem"
});

function setup<T>(hook: () => T, seed?: (queryClient: QueryClient) => void) {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({
    ...queryClient.getDefaultOptions(),
    queries: { ...queryClient.getDefaultOptions().queries, retry: false }
  });
  seed?.(queryClient);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, ...renderHook(hook, { wrapper }) };
}

const seedList = (queryClient: QueryClient) =>
  queryClient.setQueryData(CONNECTED_APPS_KEY, [app]);
const invalidated = (queryClient: QueryClient) =>
  queryClient.getQueryState(CONNECTED_APPS_KEY)?.isInvalidated;

describe("agent hooks (feat-mcp-web)", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
  });

  it("AC-4 FR-MCP-005: useConsentRequest GETs /api/v1/oauth/consent/{requestId} once; a 404 is an ApiError 404", async () => {
    api.GET.mockResolvedValueOnce({ data: consentRequest, response: res(200) });
    const ok = setup(() => useConsentRequest("abc"));
    await waitFor(() => expect(ok.result.current.isSuccess).toBe(true));
    expect(ok.result.current.data).toEqual(consentRequest);
    expect(api.GET).toHaveBeenCalledTimes(1);
    expect(api.GET).toHaveBeenCalledWith(
      "/api/v1/oauth/consent/{requestId}",
      expect.objectContaining({
        params: expect.objectContaining({ path: { requestId: "abc" } })
      })
    );
    ok.unmount();

    api.GET.mockReset();
    api.GET.mockResolvedValue({ error: problem(404), response: res(404) });
    const missing = setup(() => useConsentRequest("abc"));
    await waitFor(() => expect(missing.result.current.isError).toBe(true));
    expect(isApiError(missing.result.current.error, 404)).toBe(true);
  });

  it("AC-5 FR-MCP-005: allow POSTs …/allow and invalidates the connected apps; deny POSTs …/deny and invalidates nothing; a 410 is an ApiError 410 after one request", async () => {
    const result = { redirectUrl: "http://127.0.0.1:40000/cb?code=x" };

    api.POST.mockResolvedValueOnce({ data: result, response: res(200) });
    const allow = setup(() => useAllowConsent(), seedList);
    let allowed: unknown;
    await act(async () => {
      allowed = await allow.result.current.mutateAsync("abc");
    });
    expect(allowed).toEqual(result);
    expect(api.POST).toHaveBeenCalledTimes(1);
    expect(api.POST).toHaveBeenCalledWith(
      "/api/v1/oauth/consent/{requestId}/allow",
      expect.objectContaining({ params: { path: { requestId: "abc" } } })
    );
    expect(invalidated(allow.queryClient)).toBe(true);
    allow.unmount();

    api.POST.mockReset();
    api.POST.mockResolvedValueOnce({ data: result, response: res(200) });
    const deny = setup(() => useDenyConsent(), seedList);
    let denied: unknown;
    await act(async () => {
      denied = await deny.result.current.mutateAsync("abc");
    });
    expect(denied).toEqual(result);
    expect(api.POST).toHaveBeenCalledTimes(1);
    expect(api.POST).toHaveBeenCalledWith(
      "/api/v1/oauth/consent/{requestId}/deny",
      expect.objectContaining({ params: { path: { requestId: "abc" } } })
    );
    expect(invalidated(deny.queryClient)).toBe(false);
    deny.unmount();

    api.POST.mockReset();
    api.POST.mockResolvedValue({ error: problem(410), response: res(410) });
    const gone = setup(() => useAllowConsent(), seedList);
    act(() => gone.result.current.mutate("abc"));
    await waitFor(() => expect(gone.result.current.isError).toBe(true));
    expect(isApiError(gone.result.current.error, 410)).toBe(true);
    expect(api.POST).toHaveBeenCalledTimes(1);
  });

  it("AC-6 FR-MCP-009: useConnectedApps GETs /api/v1/connected-apps and returns items; revoke DELETEs by id and invalidates the list after success and after a 404", async () => {
    api.GET.mockResolvedValueOnce({
      data: { items: [app] },
      response: res(200)
    });
    const list = setup(() => useConnectedApps());
    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
    expect(list.result.current.data).toEqual([app]);
    expect(api.GET).toHaveBeenCalledWith(
      "/api/v1/connected-apps",
      expect.anything()
    );
    list.unmount();

    api.DELETE.mockResolvedValueOnce({ response: res(204) });
    const revoke = setup(() => useRevokeConnectedApp(), seedList);
    await act(() => revoke.result.current.mutateAsync("g1"));
    expect(api.DELETE).toHaveBeenCalledTimes(1);
    expect(api.DELETE).toHaveBeenCalledWith(
      "/api/v1/connected-apps/{id}",
      expect.objectContaining({ params: { path: { id: "g1" } } })
    );
    expect(invalidated(revoke.queryClient)).toBe(true);
    revoke.unmount();

    api.DELETE.mockReset();
    api.DELETE.mockResolvedValue({
      error: problem(404),
      response: res(404)
    });
    const missing = setup(() => useRevokeConnectedApp(), seedList);
    act(() => missing.result.current.mutate("g1"));
    await waitFor(() => expect(missing.result.current.isError).toBe(true));
    expect(isApiError(missing.result.current.error, 404)).toBe(true);
    expect(invalidated(missing.queryClient)).toBe(true);
  });
});
