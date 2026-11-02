"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { signOut } from "@/lib/auth/session";
import { routes } from "@/lib/routes";
import { NO_LOG_LINK, setLastLogLink } from "@/features/time/last-log-link";

/** Signs out, clears the query cache and goes to the sign-in page. */
export function useSignOut(): () => Promise<void> {
  const router = useRouter();
  const queryClient = useQueryClient();
  return async () => {
    await signOut();
    queryClient.clear();
    setLastLogLink(NO_LOG_LINK);
    router.replace(routes.signIn);
  };
}
