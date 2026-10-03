import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export const systemKeys = {
  all: ["system"] as const,
  version: () => [...systemKeys.all, "version"] as const
};

/** API-SYS-003. One request per page load (D6): no retry, never stale, no refetch. */
export function useApiVersion(): UseQueryResult<string> {
  return useQuery({
    queryKey: systemKeys.version(),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.GET("/api/v1/version", { signal });
      if (!data) throw new Error("GET /api/v1/version failed");
      return data.version;
    },
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
}
