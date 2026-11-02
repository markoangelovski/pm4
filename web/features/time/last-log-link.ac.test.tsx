import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  render,
  renderHook,
  screen,
  waitFor
} from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import { AuthGuard } from "@/features/auth/components/auth-guard";
import { useSignOut } from "@/features/auth/use-sign-out";
import { useDeleteProject } from "@/features/projects/api";
import { useDeleteTask, type Task } from "@/features/tasks/api";
import {
  forgetLogLinkTo,
  getLastLogLink,
  NO_LOG_LINK,
  setLastLogLink,
  type LogLink
} from "./last-log-link";

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PATCH: vi.fn(),
  PUT: vi.fn(),
  DELETE: vi.fn()
}));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/app/time",
  useSearchParams: () => new URLSearchParams()
}));

const session = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  return {
    listeners,
    signOut: vi.fn<() => Promise<void>>(),
    getAccessToken: vi.fn<() => Promise<string | null>>(),
    onSessionEnded: vi.fn((listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    })
  };
});
vi.mock("@/lib/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/session")>()),
  signOut: session.signOut,
  getAccessToken: session.getAccessToken,
  onSessionEnded: session.onSessionEnded
}));

/** The last log: task Specifications 01 of project Manhatan. */
const manhatanSpecs: LogLink = {
  project: { id: "p1", title: "Manhatan" },
  task: {
    id: "t1",
    title: "Specifications 01",
    project: { id: "p1", title: "Manhatan" }
  }
};
/** The last log: project Tesla, no task. */
const tesla: LogLink = { project: { id: "p2", title: "Tesla" }, task: null };

const specsTask = {
  id: "t1",
  project: { id: "p1", title: "Manhatan", deleted: false },
  title: "Specifications 01"
} as Task;
const otherTask = {
  id: "t9",
  project: { id: "p1", title: "Manhatan", deleted: false },
  title: "Landing page"
} as Task;

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

describe("The last log's project and task (feat-tlog-reminder D3, OQ-263)", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    api.DELETE.mockResolvedValue({
      response: new Response(null, { status: 204 })
    });
    replace.mockReset();
    session.signOut.mockReset().mockResolvedValue(undefined);
    session.getAccessToken.mockReset();
    session.listeners.clear();
    setLastLogLink(NO_LOG_LINK);
  });

  it("AC-10 FR-TLOG-004 SCR-041: forgetLogLinkTo drops the link only for its project or task; deleting that project or task forgets it", async () => {
    setLastLogLink(manhatanSpecs);
    forgetLogLinkTo("p2");
    forgetLogLinkTo("t9");
    expect(getLastLogLink()).toEqual(manhatanSpecs);
    forgetLogLinkTo("t1");
    expect(getLastLogLink()).toEqual(NO_LOG_LINK);
    setLastLogLink(manhatanSpecs);
    // A project's delete takes its tasks.
    forgetLogLinkTo("p1");
    expect(getLastLogLink()).toEqual(NO_LOG_LINK);
    setLastLogLink(tesla);
    forgetLogLinkTo("p2");
    expect(getLastLogLink()).toEqual(NO_LOG_LINK);

    // Deleting another task keeps it; deleting its task forgets it.
    const deleteTask = renderHook(() => useDeleteTask(), { wrapper }).result;
    setLastLogLink(manhatanSpecs);
    await act(() => deleteTask.current.mutateAsync(otherTask));
    expect(getLastLogLink()).toEqual(manhatanSpecs);
    await act(() => deleteTask.current.mutateAsync(specsTask));
    expect(getLastLogLink()).toEqual(NO_LOG_LINK);

    // Deleting another project keeps it; deleting its project forgets it.
    const deleteProject = renderHook(() => useDeleteProject(), {
      wrapper
    }).result;
    setLastLogLink(manhatanSpecs);
    await act(() => deleteProject.current.mutateAsync("p2"));
    expect(getLastLogLink()).toEqual(manhatanSpecs);
    await act(() => deleteProject.current.mutateAsync("p1"));
    expect(getLastLogLink()).toEqual(NO_LOG_LINK);
  });

  it("AC-11 FR-TLOG-004 SCR-041: signing out, the session ending, or no session at the guard's check forgets the link (no other user gets it in this tab)", async () => {
    setLastLogLink(manhatanSpecs);
    const signOut = renderHook(() => useSignOut(), { wrapper }).result;
    await act(() => signOut.current());
    expect(session.signOut).toHaveBeenCalledTimes(1);
    expect(getLastLogLink()).toEqual(NO_LOG_LINK);

    setLastLogLink(manhatanSpecs);
    session.getAccessToken.mockResolvedValue("A1");
    render(
      <AuthGuard>
        <div>Private content</div>
      </AuthGuard>,
      { wrapper }
    );
    expect(await screen.findByText("Private content")).toBeInTheDocument();
    expect(getLastLogLink()).toEqual(manhatanSpecs);
    act(() => {
      for (const listener of [...session.listeners]) listener();
    });
    expect(getLastLogLink()).toEqual(NO_LOG_LINK);

    // No session when the guard checks (e.g. the refresh token is gone): also reset.
    setLastLogLink(manhatanSpecs);
    session.getAccessToken.mockResolvedValue(null);
    render(
      <AuthGuard>
        <div>Other content</div>
      </AuthGuard>,
      { wrapper }
    );
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(getLastLogLink()).toEqual(NO_LOG_LINK);
  });
});
