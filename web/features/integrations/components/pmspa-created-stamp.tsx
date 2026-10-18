"use client";

/**
 * OQ-207: beside a linked project's or task's own Created and Last modified, when PMSPA created its linked
 * record. Renders nothing for a record that isn't linked, or without a saved connection.
 */
export function PmspaCreatedStamp({
  type,
  id,
  timeZone
}: {
  type: "project" | "task";
  id: string;
  timeZone: string | undefined;
}): React.ReactNode {
  void [type, id, timeZone];
  throw new Error("not implemented (feat-int-followups)");
}
