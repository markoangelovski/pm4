import type { UseQueryResult } from "@tanstack/react-query";

export const systemKeys = {
  all: ["system"] as const,
  version: () => [...systemKeys.all, "version"] as const
};

/** API-SYS-003. One request per page load (D6): no retry, never stale, no refetch. */
export function useApiVersion(): UseQueryResult<string> {
  throw new Error("not implemented (feat-shell-sidebar-branding)");
}
