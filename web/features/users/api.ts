import {
  type UseMutationResult,
  type UseQueryResult
} from "@tanstack/react-query";
import type { components } from "@/lib/api/schema";

export type Me = components["schemas"]["MeResponseDto"];

export const userKeys = {
  all: ["users"] as const,
  me: () => [...userKeys.all, "me"] as const
};

/** API-USR-001. App defaults (staleTime 30 s, retry 1). */
export function useMe(): UseQueryResult<Me> {
  throw new Error("not implemented (feat-shell-user-menu)");
}

/** API-AUTH-006, then the local sign-out (FR-AUTH-007: this device → /auth/sign-in). No retry (mutation default). */
export function useSignOutEverywhere(): UseMutationResult<void, Error, void> {
  throw new Error("not implemented (feat-shell-user-menu)");
}
