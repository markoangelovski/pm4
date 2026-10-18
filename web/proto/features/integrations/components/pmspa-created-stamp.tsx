"use client";

import { formatDateTime } from "@/lib/time";
import { usePmspaLinks } from "../api";

/**
 * OQ-207: beside a linked project's or task's own Created and Last modified, when PMSPA created its linked
 * record. It comes with the sync flags' link list (no PMSPA call). Renders nothing for a record that isn't
 * linked, or without a saved connection.
 */
export function PmspaCreatedStamp({
  type,
  id,
  timeZone
}: {
  type: "project" | "task";
  id: string;
  timeZone: string | undefined;
}) {
  const { data: links } = usePmspaLinks(type);
  const link = links?.get(id);
  if (!link || !timeZone) return null;
  return (
    <span>
      <span>Created in PMSPA</span>{" "}
      {formatDateTime(link.pmspaCreatedAt, timeZone)}
    </span>
  );
}
