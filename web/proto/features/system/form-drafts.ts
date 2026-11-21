"use client";

import { useEffect, useState } from "react";
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type UseFormProps,
  type UseFormReturn
} from "react-hook-form";

/**
 * Unsaved form drafts: what the user typed into a form dialog survives closing it by accident (click outside,
 * Escape, the X) and comes back when the same dialog opens again. Submitting or Cancel drops it.
 *
 * Module state, so drafts last until the page reloads or the user signs out. One draft per form and item:
 * `draftKey("log")` for a new log, `draftKey("log", id)` for editing log `id`.
 */
const drafts = new Map<string, unknown>();

export const draftKey = (form: string, id?: string): string =>
  `${form}:${id ?? "new"}`;

/** Drops the edit drafts of the deleted item `id`. */
export function forgetDraftsOf(id: string): void {
  for (const key of drafts.keys()) {
    if (key.endsWith(`:${id}`)) drafts.delete(key);
  }
}

/**
 * Unlinks the deleted project or task `id` from every draft (a project's delete takes its tasks): a `project` or
 * `task` field pointing at it becomes null, and a cleared project takes its `serviceId` with it. The draft stays, so
 * a restored form just shows no project or task.
 */
export function forgetDraftLinksTo(id: string): void {
  for (const [key, value] of drafts) {
    if (typeof value !== "object" || value === null) continue;
    const draft = value as {
      project?: { id: string } | null;
      task?: { id: string; project: { id: string } } | null;
      serviceId?: string | null;
    };
    const next = { ...draft };
    if (draft.task && (draft.task.id === id || draft.task.project.id === id)) {
      next.task = null;
    }
    if (draft.project?.id === id) {
      next.project = null;
      if ("serviceId" in draft) next.serviceId = null;
    }
    if (next.task !== draft.task || next.project !== draft.project) {
      drafts.set(key, next);
    }
  }
}

/** Drops every draft (sign-out). */
export function clearFormDrafts(): void {
  drafts.clear();
}

export interface FormDraft {
  /** The form opened with a draft instead of its normal starting values. */
  restored: boolean;
  /** Drops the draft and resets the form to its normal starting values. */
  discard: () => void;
  /** Drops the draft (after a successful submit, or on Cancel). */
  clear: () => void;
}

/**
 * `useForm` that starts from the draft under `key` when there is one, else from `options.defaultValues`, and keeps
 * the draft up to date while the user edits. Values equal to the starting values leave no draft.
 */
export function useDraftForm<
  TFieldValues extends FieldValues,
  TContext = unknown,
  TTransformedValues = TFieldValues
>(
  key: string,
  options: UseFormProps<TFieldValues, TContext, TTransformedValues> & {
    defaultValues: TFieldValues;
  }
): {
  form: UseFormReturn<TFieldValues, TContext, TTransformedValues>;
  draft: FormDraft;
} {
  const [base] = useState(() => options.defaultValues);
  const [saved] = useState(() => drafts.get(key) as TFieldValues | undefined);
  const [restored, setRestored] = useState(saved !== undefined);
  const form = useForm<TFieldValues, TContext, TTransformedValues>({
    ...options,
    defaultValues: (saved ?? base) as DefaultValues<TFieldValues>
  });

  useEffect(() => {
    const initial = JSON.stringify(base);
    return form.subscribe({
      formState: { values: true },
      callback: ({ values }) => {
        if (JSON.stringify(values) === initial) drafts.delete(key);
        else drafts.set(key, structuredClone(values));
      }
    });
  }, [form, key, base]);

  return {
    form,
    draft: {
      restored,
      discard: () => {
        drafts.delete(key);
        form.reset(base, { keepFieldsRef: true });
        setRestored(false);
      },
      clear: () => {
        drafts.delete(key);
      }
    }
  };
}
