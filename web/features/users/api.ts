import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/problem";
import { useSignOut } from "@/features/auth/use-sign-out";
import type { components } from "@/lib/api/schema";

export type Me = components["schemas"]["MeResponseDto"];
export type UserSummary = components["schemas"]["UserSummaryDto"];

export const userKeys = {
  all: ["users"] as const,
  me: () => [...userKeys.all, "me"] as const,
  search: (q: string) => [...userKeys.all, "search", q] as const
};

/** API-USR-001. App defaults (staleTime 30 s, retry 1). */
export function useMe(): UseQueryResult<Me> {
  return useQuery({
    queryKey: userKeys.me(),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.GET("/api/v1/me", { signal });
      if (!data) throw new Error("GET /api/v1/me failed");
      return data;
    }
  });
}

/** API-AUTH-006, then the local sign-out (FR-AUTH-007: this device → /auth/sign-in). No retry (mutation default). */
export function useSignOutEverywhere(): UseMutationResult<void, Error, void> {
  const signOut = useSignOut();
  return useMutation({
    mutationFn: async () => {
      const { response } = await apiClient.POST("/api/v1/auth/logout-all");
      if (response.status !== 204)
        throw new Error("POST /api/v1/auth/logout-all failed");
    },
    onSuccess: () => signOut()
  });
}

/** API-USR-003. Enabled only when q.trim().length >= 2; the key uses the trimmed q; staleTime 60 s. */
export function useUserSearch(q: string): UseQueryResult<UserSummary[]> {
  const term = q.trim();
  return useQuery({
    queryKey: userKeys.search(term),
    queryFn: async ({ signal }) =>
      unwrap(
        await apiClient.GET("/api/v1/users", {
          params: { query: { q: term } },
          signal
        })
      ).items,
    enabled: term.length >= 2,
    staleTime: 60_000
  });
}
