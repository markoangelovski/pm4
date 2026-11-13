"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { signOut } from "@/lib/auth/session";
import { routes } from "@/lib/routes";
import { NO_LOG_LINK, setLastLogLink } from "@/features/time/last-log-link";

/** Signs out, clears the query cache and goes to `to`: the sign-in page (FR-AUTH-004, FR-AUTH-007), or `/` after deleting the account (FR-AUTH-008). */
export function useSignOut(to: string = routes.signIn): () => Promise<void> {
  const router = useRouter();
  const queryClient = useQueryClient();
  return async () => {
    await signOut();
    queryClient.clear();
    setLastLogLink(NO_LOG_LINK);
    router.replace(to);
  };
}
