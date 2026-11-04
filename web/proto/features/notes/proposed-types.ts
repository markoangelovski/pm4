// API shapes the Notes page needs that `lib/api/schema.d.ts` doesn't have yet (prototype.md#mock-data-layer).
import type { components } from "@/lib/api/schema";

/**
 * GET /notes' `sort`, plus `title:asc` (proposed): the title A–Z, case-insensitive; notes without a title after the
 * titled ones, most recently edited first. With `from`/`to`, the range is on `updatedAt`. GET /todos doesn't take it.
 */
export type NoteSortDto = components["schemas"]["NoteSort"] | "title:asc";
