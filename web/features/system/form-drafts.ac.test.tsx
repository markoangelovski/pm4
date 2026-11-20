import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import { useDeleteProject } from "@/features/projects/api";
import { useDeleteTask, type Task } from "@/features/tasks/api";
import { useDeleteNote, useDeleteTodo } from "@/features/notes/api";

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PUT: vi.fn(),
  PATCH: vi.fn(),
  DELETE: vi.fn()
}));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

type Values = { title: string };

/**
 * `./form-drafts` is promoted from the prototype in T1 (`pm4 promote`), so it is loaded at run time, through this
 * local type, instead of imported: the typecheck passes before it exists.
 */
interface FormDrafts {
  draftKey: (form: string, id?: string) => string;
  forgetDraftsOf: (id: string) => void;
  clearFormDrafts: () => void;
  useDraftForm: (
    key: string,
    options: { defaultValues: Values }
  ) => {
    form: {
      setValue: (name: "title", value: string) => void;
      getValues: (name: "title") => string;
    };
    draft: { restored: boolean; discard: () => void; clear: () => void };
  };
}
const FORM_DRAFTS = "./form-drafts";

let draftKey!: FormDrafts["draftKey"];
let forgetDraftsOf!: FormDrafts["forgetDraftsOf"];
let clearFormDrafts!: FormDrafts["clearFormDrafts"];
let useDraftForm!: FormDrafts["useDraftForm"];

beforeAll(async () => {
  ({ draftKey, forgetDraftsOf, clearFormDrafts, useDraftForm } = (await import(
    /* @vite-ignore */ FORM_DRAFTS
  )) as FormDrafts);
});

/** Mounts a `{ title }` form under `key`, as a form dialog does when it opens. */
function mountForm(key: string) {
  return renderHook(() => useDraftForm(key, { defaultValues: { title: "" } }));
}

/** Opens the form under `key`, types `title` and closes it (unmount), leaving a draft. */
function leaveDraft(key: string, title: string) {
  const view = mountForm(key);
  act(() => view.result.current.form.setValue("title", title));
  view.unmount();
}

/** Opens the form under `key` and reports what it starts with. */
function reopen(key: string) {
  const view = mountForm(key);
  const state = {
    title: view.result.current.form.getValues("title"),
    restored: view.result.current.draft.restored
  };
  view.unmount();
  return state;
}

describe("useDraftForm (conventions.md#forms, feat-shell-form-drafts)", () => {
  beforeEach(() => {
    clearFormDrafts();
  });

  it("AC-1 OQ-284: a form closed with an edit opens again with the draft, marked restored", () => {
    leaveDraft(draftKey("project"), "Draft");
    expect(reopen(draftKey("project"))).toEqual({
      title: "Draft",
      restored: true
    });
  });

  it("AC-2 OQ-284: values back at the starting ones leave no draft", () => {
    const view = mountForm(draftKey("project"));
    act(() => view.result.current.form.setValue("title", "Draft"));
    act(() => view.result.current.form.setValue("title", ""));
    view.unmount();
    expect(reopen(draftKey("project"))).toEqual({
      title: "",
      restored: false
    });
  });

  it("AC-3 OQ-284: Discard goes back to the starting values and drops the draft", () => {
    leaveDraft(draftKey("project"), "Draft");
    const view = mountForm(draftKey("project"));
    expect(view.result.current.draft.restored).toBe(true);
    act(() => view.result.current.draft.discard());
    expect(view.result.current.form.getValues("title")).toBe("");
    expect(view.result.current.draft.restored).toBe(false);
    view.unmount();
    expect(reopen(draftKey("project"))).toEqual({
      title: "",
      restored: false
    });
  });

  it("AC-4 OQ-284: clear() (submit or Cancel) drops the draft", () => {
    const view = mountForm(draftKey("project"));
    act(() => view.result.current.form.setValue("title", "Draft"));
    act(() => view.result.current.draft.clear());
    view.unmount();
    expect(reopen(draftKey("project"))).toEqual({
      title: "",
      restored: false
    });
  });

  it("AC-5 OQ-284: one draft per form and item; forgetDraftsOf drops only that item's", () => {
    leaveDraft(draftKey("task"), "New");
    leaveDraft(draftKey("task", "a"), "Edit A");
    leaveDraft(draftKey("task", "b"), "Edit B");

    expect(reopen(draftKey("task")).title).toBe("New");
    expect(reopen(draftKey("task", "a")).title).toBe("Edit A");
    expect(reopen(draftKey("task", "b")).title).toBe("Edit B");

    forgetDraftsOf("a");
    expect(reopen(draftKey("task", "a"))).toEqual({
      title: "",
      restored: false
    });
    expect(reopen(draftKey("task")).title).toBe("New");
    expect(reopen(draftKey("task", "b")).title).toBe("Edit B");
  });

  it("AC-6 OQ-284: deleting a project, task, note or to-do drops its edit draft; clearFormDrafts drops all", async () => {
    api.DELETE.mockResolvedValue({
      response: new Response(null, { status: 204 })
    });
    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    leaveDraft(draftKey("project", "p1"), "Project p1");
    leaveDraft(draftKey("project", "p2"), "Project p2");
    leaveDraft(draftKey("task", "t1"), "Task t1");
    leaveDraft(draftKey("note", "n1"), "Note n1");
    leaveDraft(draftKey("todo", "d1"), "Todo d1");

    const hooks = renderHook(
      () => ({
        project: useDeleteProject(),
        task: useDeleteTask(),
        note: useDeleteNote(),
        todo: useDeleteTodo()
      }),
      { wrapper }
    );
    const task = { id: "t1", project: { id: "p1" } } as unknown as Task;
    await act(async () => {
      await hooks.result.current.project.mutateAsync("p1");
      await hooks.result.current.task.mutateAsync(task);
      await hooks.result.current.note.mutateAsync("n1");
      await hooks.result.current.todo.mutateAsync("d1");
    });
    await waitFor(() => expect(api.DELETE).toHaveBeenCalledTimes(4));

    for (const key of [
      draftKey("project", "p1"),
      draftKey("task", "t1"),
      draftKey("note", "n1"),
      draftKey("todo", "d1")
    ]) {
      expect(reopen(key)).toEqual({ title: "", restored: false });
    }
    expect(reopen(draftKey("project", "p2"))).toEqual({
      title: "Project p2",
      restored: true
    });

    leaveDraft(draftKey("log"), "New log");
    clearFormDrafts();
    expect(reopen(draftKey("project", "p2")).restored).toBe(false);
    expect(reopen(draftKey("log")).restored).toBe(false);
  });
});
