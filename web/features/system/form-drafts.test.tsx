import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import { useDeleteProject } from "@/features/projects/api";
import { useDeleteTask, type Task } from "@/features/tasks/api";
import {
  clearFormDrafts,
  draftKey,
  forgetDraftLinksTo,
  useDraftForm
} from "./form-drafts";

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PUT: vi.fn(),
  PATCH: vi.fn(),
  DELETE: vi.fn()
}));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

interface Ref {
  id: string;
  title: string;
}
interface Linked {
  note: string;
  project: Ref | null;
  task: (Ref & { project: Ref }) | null;
  serviceId?: string | null;
}

const P1: Ref = { id: "p1", title: "Anthropic" };
const P2: Ref = { id: "p2", title: "Nvidia" };
const T1 = { id: "t1", title: "Spec", project: P1 };
const T2 = { id: "t2", title: "Review", project: P1 };
const T3 = { id: "t3", title: "Deploy", project: P2 };
const EMPTY: Linked = { note: "", project: null, task: null };

/** Opens a form under `key`, enters `values` and closes it, leaving a draft. */
function leaveDraft(key: string, values: Linked) {
  const view = renderHook(() =>
    useDraftForm<Linked>(key, { defaultValues: { ...EMPTY } })
  );
  act(() => {
    const { setValue } = view.result.current.form;
    setValue("note", values.note);
    setValue("project", values.project);
    setValue("task", values.task);
    if (values.serviceId !== undefined) {
      setValue("serviceId", values.serviceId);
    }
  });
  view.unmount();
}

/** Opens the form under `key` and returns what it starts with. */
function reopen(key: string): Linked {
  const view = renderHook(() =>
    useDraftForm<Linked>(key, { defaultValues: { ...EMPTY } })
  );
  const values = view.result.current.form.getValues();
  view.unmount();
  return values;
}

describe("forgetDraftLinksTo (conventions.md#forms, OQ-310)", () => {
  beforeEach(() => {
    clearFormDrafts();
  });

  it("a deleted task is unlinked; its project and the rest of the draft stay", () => {
    leaveDraft(draftKey("log"), { note: "Wrote it", project: P1, task: T1 });
    forgetDraftLinksTo("t1");
    expect(reopen(draftKey("log"))).toEqual({
      note: "Wrote it",
      project: P1,
      task: null
    });
  });

  it("a deleted project is unlinked with its tasks and the service", () => {
    leaveDraft(draftKey("note"), { note: "N", project: P1, task: T2 });
    leaveDraft(draftKey("task"), {
      note: "T",
      project: P1,
      task: null,
      serviceId: "s1"
    });
    forgetDraftLinksTo("p1");
    expect(reopen(draftKey("note"))).toEqual({
      note: "N",
      project: null,
      task: null
    });
    expect(reopen(draftKey("task"))).toEqual({
      note: "T",
      project: null,
      task: null,
      serviceId: null
    });
  });

  it("drafts linking other items are unchanged", () => {
    leaveDraft(draftKey("todo"), {
      note: "D",
      project: P2,
      task: T3,
      serviceId: "s2"
    });
    forgetDraftLinksTo("p1");
    forgetDraftLinksTo("t1");
    expect(reopen(draftKey("todo"))).toEqual({
      note: "D",
      project: P2,
      task: T3,
      serviceId: "s2"
    });
  });

  it("useDeleteProject and useDeleteTask unlink the deleted item", async () => {
    api.DELETE.mockResolvedValue({
      response: new Response(null, { status: 204 })
    });
    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    leaveDraft(draftKey("log"), { note: "L", project: P2, task: T3 });
    leaveDraft(draftKey("note"), { note: "N", project: P1, task: null });

    const hooks = renderHook(
      () => ({ project: useDeleteProject(), task: useDeleteTask() }),
      { wrapper }
    );
    await act(async () => {
      await hooks.result.current.task.mutateAsync({
        id: "t3",
        project: { id: "p2" }
      } as unknown as Task);
      await hooks.result.current.project.mutateAsync("p1");
    });
    await waitFor(() => expect(api.DELETE).toHaveBeenCalledTimes(2));

    expect(reopen(draftKey("log"))).toEqual({
      note: "L",
      project: P2,
      task: null
    });
    expect(reopen(draftKey("note"))).toEqual({
      note: "N",
      project: null,
      task: null
    });
  });
});
