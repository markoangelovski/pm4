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

/**
 * feat-shell-form-drafts promotes `form-drafts.ts` in its T1. It is loaded at run time, through this local type,
 * so this file's other tests run before it exists.
 */
interface FormDrafts {
  draftKey: (form: string, id?: string) => string;
  useDraftForm: (
    key: string,
    options: { defaultValues: { title: string } }
  ) => {
    form: { setValue: (name: "title", value: string) => void };
    draft: { restored: boolean };
  };
}
const FORM_DRAFTS = "@/features/system/form-drafts";
const loadFormDrafts = () =>
  import(/* @vite-ignore */ FORM_DRAFTS) as Promise<FormDrafts>;

/** Leaves a draft of a new project, as a dialog closed by Escape does. */
async function leaveProjectDraft(): Promise<() => boolean> {
  const { draftKey, useDraftForm } = await loadFormDrafts();
  const key = draftKey("project");
  const useProjectForm = () =>
    useDraftForm(key, { defaultValues: { title: "" } });
  const typed = renderHook(useProjectForm);
  act(() => typed.result.current.form.setValue("title", "Draft"));
  typed.unmount();
  /** True while a dialog opening now would restore the draft. */
  return () => {
    const view = renderHook(useProjectForm);
    const restored = view.result.current.draft.restored;
    view.unmount();
    return restored;
  };
}

describe("useSignOut drops the form drafts (feat-shell-form-drafts)", () => {
  beforeEach(() => {
    replace.mockReset();
    signOut.mockReset();
    signOut.mockResolvedValue(undefined);
  });

  it("AC-9 OQ-284: signing out drops the unsaved form drafts", async () => {
    const draftRestores = await leaveProjectDraft();
    expect(draftRestores()).toBe(true);

    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useSignOut(), { wrapper });
    await act(async () => {
      await result.current();
    });

    expect(replace).toHaveBeenCalledWith("/auth/sign-in");
    expect(draftRestores()).toBe(false);
  });
});
