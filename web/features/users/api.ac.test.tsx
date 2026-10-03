import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import { useMe, useSignOutEverywhere, type Me } from "./api";

const GET = vi.hoisted(() => vi.fn());
const POST = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/client", () => ({
  apiClient: { GET, POST }
}));

const signOut = vi.hoisted(() => vi.fn<() => Promise<void>>());

vi.mock("@/features/auth/use-sign-out", () => ({
  useSignOut: () => signOut
}));

const me: Me = {
  id: "0b6c7d2e-1f3a-4c5b-9d8e-7f6a5b4c3d2e",
  email: "marko@example.com",
  displayName: "Marko Angelovski",
  avatarUrl: "https://lh3.googleusercontent.com/a/photo",
  timeZone: "Europe/Zagreb",
  createdAt: "2026-10-02T22:30:00.000Z"
};

function setup<T>(hook: () => T) {
  const queryClient = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, ...renderHook(hook, { wrapper }) };
}

describe("useMe (feat-shell-user-menu)", () => {
  beforeEach(() => {
    GET.mockReset();
  });

  it("AC-1 API-USR-001: returns the current user under the key [users, me]; an error response → error state", async () => {
    GET.mockResolvedValue({ data: me });
    const ok = setup(() => useMe());

    await waitFor(() => expect(ok.result.current.isSuccess).toBe(true));
    expect(ok.result.current.data).toEqual(me);
    expect(GET).toHaveBeenCalledWith("/api/v1/me", expect.anything());
    expect(ok.queryClient.getQueryData(["users", "me"])).toEqual(me);
    ok.unmount();

    GET.mockReset();
    GET.mockResolvedValue({ error: { status: 500 } });
    const failed = setup(() => useMe());
    // App default retry: 1 (one retry after the default delay).
    await waitFor(() => expect(failed.result.current.isError).toBe(true), {
      timeout: 4000
    });
  });
});

describe("useSignOutEverywhere (feat-shell-user-menu)", () => {
  beforeEach(() => {
    POST.mockReset();
    signOut.mockReset();
    signOut.mockResolvedValue(undefined);
  });

  it("AC-2 API-AUTH-006 FR-AUTH-007: 204 → signs out locally once; 500 → error state, no sign-out, no retry", async () => {
    POST.mockResolvedValue({ response: new Response(null, { status: 204 }) });
    const ok = setup(() => useSignOutEverywhere());

    act(() => ok.result.current.mutate());
    await waitFor(() => expect(ok.result.current.isSuccess).toBe(true));
    expect(POST).toHaveBeenCalledWith("/api/v1/auth/logout-all");
    expect(signOut).toHaveBeenCalledTimes(1);
    ok.unmount();

    POST.mockReset();
    signOut.mockReset();
    POST.mockResolvedValue({
      error: { status: 500 },
      response: new Response(null, { status: 500 })
    });
    const failed = setup(() => useSignOutEverywhere());

    act(() => failed.result.current.mutate());
    await waitFor(() => expect(failed.result.current.isError).toBe(true));
    expect(POST).toHaveBeenCalledTimes(1);
    expect(signOut).not.toHaveBeenCalled();
  });
});
