// API shapes the prototype needs that `lib/api/schema` doesn't have yet (OQ-132). `npm run api:types`
// replaces them once the API serves them.
import type { components } from "@/lib/api/schema";

/** API-PRJ-002/003 project, plus `loggedMinutes`: every log of the project and its tasks, summed in the query. */
export type ProjectResponseDto = components["schemas"]["ProjectResponseDto"] & {
  loggedMinutes: number;
};

export type ProjectListResponseDto = Omit<
  components["schemas"]["ProjectListResponseDto"],
  "items"
> & { items: ProjectResponseDto[] };
