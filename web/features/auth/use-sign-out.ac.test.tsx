import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import { useSignOut } from "./use-sign-out";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams()
}));

const signOut = vi.hoisted(() => vi.fn<() => Promise<void>>());

vi.mock("@/lib/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/session")>()),
  signOut
}));

describe("useSignOut (feat-auth-web-session)", () => {
  it("AC-22 FR-AUTH-004: signs out, clears the query cache, then goes to /auth/sign-in", async () => {
    signOut.mockResolvedValue(undefined);
    const queryClient = createQueryClient();
    queryClient.setQueryData(["projects"], ["data"]);
    const clear = vi.spyOn(queryClient, "clear");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useSignOut(), { wrapper });

    await act(async () => {
      await result.current();
    });

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(["projects"])).toBeUndefined();
    expect(replace).toHaveBeenCalledWith("/auth/sign-in");
    expect(signOut.mock.invocationCallOrder[0]).toBeLessThan(
      clear.mock.invocationCallOrder[0]
    );
    expect(clear.mock.invocationCallOrder[0]).toBeLessThan(
      replace.mock.invocationCallOrder[0]
    );
  });
});

/** `useSignOut(to)` (D1). Called through this type until T2 adds the parameter. */
const useSignOutTo = useSignOut as (to?: string) => () => Promise<void>;

describe("useSignOut target (feat-acct-web)", () => {
  beforeEach(() => {
    replace.mockReset();
    signOut.mockReset();
    signOut.mockResolvedValue(undefined);
  });

  function setup(to?: string) {
    const queryClient = createQueryClient();
    queryClient.setQueryData(["projects"], ["data"]);
    const clear = vi.spyOn(queryClient, "clear");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () => (to === undefined ? useSignOutTo() : useSignOutTo(to)),
      { wrapper }
    );
    return { queryClient, clear, result };
  }

  it('AC-6 D1: useSignOut() still ends on /auth/sign-in; useSignOut("/") signs out, clears the cache, then replace("/")', async () => {
    const byDefault = setup();
    await act(async () => {
      await byDefault.result.current();
    });
    expect(replace).toHaveBeenCalledWith("/auth/sign-in");

    replace.mockReset();
    signOut.mockClear();
    const toLanding = setup("/");
    await act(async () => {
      await toLanding.result.current();
    });

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(toLanding.queryClient.getQueryData(["projects"])).toBeUndefined();
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/");
    expect(signOut.mock.invocationCallOrder[0]).toBeLessThan(
      toLanding.clear.mock.invocationCallOrder[0]
    );
    expect(toLanding.clear.mock.invocationCallOrder[0]).toBeLessThan(
      replace.mock.invocationCallOrder[0]
    );
  });
});
