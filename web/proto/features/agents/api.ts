import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult
} from "@tanstack/react-query";
import { apiClient } from "@/proto/mock/client";
import { unwrap, unwrapVoid } from "@/lib/api/problem";
import type { components } from "@/lib/api/schema";
import type { ConnectedAppDto } from "./proposed-types";

export type ConsentRequest = components["schemas"]["ConsentRequestDto"];
export type ConsentResult = components["schemas"]["ConsentResultDto"];
export type ConnectedApp = ConnectedAppDto;

export const agentKeys = {
  all: ["agents"] as const,
  consent: (requestId: string) =>
    [...agentKeys.all, "consent", requestId] as const,
  connectedApps: () => [...agentKeys.all, "connected-apps"] as const
};

/** The pending authorization request the consent page shows (FR-MCP-005). */
export function useConsentRequest(
  requestId: string
): UseQueryResult<ConsentRequest, Error> {
  return useQuery({
    queryKey: agentKeys.consent(requestId),
    queryFn: async ({ signal }) =>
      unwrap(
        await apiClient.GET("/api/v1/oauth/consent/{requestId}", {
          params: { path: { requestId } },
          signal
        })
      )
  });
}

/** Allow: creates or replaces the grant (OQ-293); invalidates the Connected apps list. */
export function useAllowConsent(): UseMutationResult<
  ConsentResult,
  Error,
  string
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId) =>
      unwrap(
        await apiClient.POST("/api/v1/oauth/consent/{requestId}/allow", {
          params: { path: { requestId } }
        })
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: agentKeys.connectedApps() })
  });
}

/** Deny: the app gets `access_denied`, no grant changes. */
export function useDenyConsent(): UseMutationResult<
  ConsentResult,
  Error,
  string
> {
  return useMutation({
    mutationFn: async (requestId) =>
      unwrap(
        await apiClient.POST("/api/v1/oauth/consent/{requestId}/deny", {
          params: { path: { requestId } }
        })
      )
  });
}

/** Settings → Connected apps (FR-MCP-009): the user's grants, most recently connected first. */
export function useConnectedApps(): UseQueryResult<ConnectedApp[], Error> {
  return useQuery({
    queryKey: agentKeys.connectedApps(),
    queryFn: async ({ signal }) =>
      unwrap(await apiClient.GET("/api/v1/connected-apps", { signal })).items
  });
}

/** Revoke: ends the grant; invalidates the list. */
export function useRevokeConnectedApp(): UseMutationResult<
  void,
  Error,
  string
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) =>
      unwrapVoid(
        await apiClient.DELETE("/api/v1/connected-apps/{id}", {
          params: { path: { id } }
        })
      ),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: agentKeys.connectedApps() })
  });
}
