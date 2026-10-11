import { formatDuration } from "@/lib/time";

/** A project's or task's total logged time for the list pages' Logged column; `—` when nothing is logged. */
export function LoggedTotal({ minutes }: { minutes: number }) {
  return minutes > 0 ? (
    <span className="tabular-nums">{formatDuration(minutes)}</span>
  ) : (
    <span className="text-muted-foreground">—</span>
  );
}
