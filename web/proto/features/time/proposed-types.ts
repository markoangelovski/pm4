// API shapes the prototype needs that `lib/api/schema` doesn't have yet. `npm run api:types` replaces
// them once the API serves them.

/**
 * `apiClient.DELETE` for API-WD-004 until `lib/api/schema` has it (the hook casts to this).
 * `DELETE /workdays/{date}` → 204: deletes the day's start and its logs (with their bookings).
 * Logs of other days booked to this date keep their booking. A day without a start or logs → 404.
 */
export type DeleteWorkday = (
  path: "/api/v1/workdays/{date}",
  init: { params: { path: { date: string } } }
) => Promise<{ data?: never; error?: unknown; response: Response }>;
