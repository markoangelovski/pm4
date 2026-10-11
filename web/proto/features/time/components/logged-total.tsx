"use client";

import { formatDuration } from "@/lib/time";
import { useLoggedTotals } from "@/proto/mock/hooks";

/** A project's or task's total logged time for the list pages; `—` when nothing is logged. */
export function LoggedTotal({
  kind,
  id
}: {
  kind: "project" | "task";
  id: string;
}) {
  const totals = useLoggedTotals();
  const minutes =
    (kind === "project" ? totals.projects : totals.tasks)[id] ?? 0;
  return minutes > 0 ? (
    <span className="tabular-nums">{formatDuration(minutes)}</span>
  ) : (
    <span className="text-muted-foreground">—</span>
  );
}
