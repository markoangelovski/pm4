"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { routes } from "@/proto/lib/routes";

/**
 * pm4-twin: differs (the prototype can't import lib/auth: it signs out without the API and goes to the landing page)
 *
 * Twin of `features/auth/use-sign-out`. The prototype is always signed in: signing out clears the query
 * cache and goes to the landing page; the mock data stays until a reload.
 */
export function useSignOut(): () => Promise<void> {
  const router = useRouter();
  const queryClient = useQueryClient();
  return async () => {
    queryClient.clear();
    router.replace(routes.landing);
  };
}
