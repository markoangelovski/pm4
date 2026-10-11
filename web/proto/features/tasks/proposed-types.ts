// API shapes the prototype needs that `lib/api/schema` doesn't have yet (OQ-132). `npm run api:types`
// replaces them once the API serves them.
import type { components } from "@/lib/api/schema";

/** API-TSK-002/003 task, plus `loggedMinutes`: every log of the task, summed in the query. */
export type TaskResponseDto = components["schemas"]["TaskResponseDto"] & {
  loggedMinutes: number;
};
