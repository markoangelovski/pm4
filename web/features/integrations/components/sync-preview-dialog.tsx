"use client";

import type { ReactNode } from "react";
import type { components } from "@/lib/api/schema";

// Typed stub (feat-int-web). T2 replaces this file with the twin of the prototype's sync-preview-dialog.tsx.
type S = components["schemas"];

export type SyncMode = "import" | "push" | "sync";

/** FR-INT-008, FR-INT-011, FR-INT-012: the preview, then the per-record outcome. */
export function SyncPreviewDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: SyncMode;
  title: string;
  description: ReactNode;
  items: S["SyncPreviewItemDto"][] | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  onRun: (choices: S["SyncChoiceDto"][]) => Promise<S["SyncResultDto"]>;
}): ReactNode {
  void props;
  throw new Error("not implemented (feat-int-web)");
}
