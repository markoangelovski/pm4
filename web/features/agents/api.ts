import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import type { components } from "@/lib/api/schema";

export type ConsentRequest = components["schemas"]["ConsentRequestDto"];
export type ConsentResult = components["schemas"]["ConsentResultDto"];
export type ConnectedApp = components["schemas"]["ConnectedAppDto"];

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
  void requestId;
  throw new Error("not implemented (feat-mcp-web)");
}

/** Allow: creates or replaces the grant; invalidates the Connected apps list. */
export function useAllowConsent(): UseMutationResult<
  ConsentResult,
  Error,
  string
> {
  throw new Error("not implemented (feat-mcp-web)");
}

/** Deny: the app gets `access_denied`, no grant changes. */
export function useDenyConsent(): UseMutationResult<
  ConsentResult,
  Error,
  string
> {
  throw new Error("not implemented (feat-mcp-web)");
}

/** Settings → Connected apps (FR-MCP-009). */
export function useConnectedApps(): UseQueryResult<ConnectedApp[], Error> {
  throw new Error("not implemented (feat-mcp-web)");
}

/** Revoke: ends the grant; invalidates the list. */
export function useRevokeConnectedApp(): UseMutationResult<
  void,
  Error,
  string
> {
  throw new Error("not implemented (feat-mcp-web)");
}
