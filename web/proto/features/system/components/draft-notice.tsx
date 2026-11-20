"use client";

import type { FormDraft } from "../form-drafts";

/** Shown at the top of a form dialog that opened with an unsaved draft: Discard goes back to the starting values. */
export function DraftNotice({ draft }: { draft: FormDraft }) {
  if (!draft.restored) return null;
  return (
    <p className="-mt-2 text-xs text-muted-foreground">
      Unsaved draft restored ·{" "}
      <button
        type="button"
        onClick={draft.discard}
        className="cursor-pointer underline underline-offset-2 hover:text-foreground"
      >
        Discard
      </button>
    </p>
  );
}
