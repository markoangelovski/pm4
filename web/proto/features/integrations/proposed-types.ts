// Proposed API shapes for feat-int-followups that `lib/api/schema.d.ts` doesn't have yet (prototype.md):
// `npm run api:types` replaces them after the API task.

/**
 * OQ-207: API-INT-012's link, with when PMSPA created the linked record. Derived from the link's `pmspa_id`
 * (a PMSPA ObjectId starts with its creation second), so no column and no PMSPA call. ISO 8601 UTC.
 */
export type PmspaLinkCreatedAtDto = { pmspaCreatedAt: string };
