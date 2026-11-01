"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { notifyRateLimited } from "../rate-limit";

/**
 * Shows the one rate-limit toast whenever a query or mutation fails with a 429 (OQ-256). Mounted once in the
 * signed-in shell; the screens keep their own error states and toasts.
 */
export function RateLimitNotifier(): null {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribeQueries = queryClient
      .getQueryCache()
      .subscribe((event) => {
        if (event.type === "updated" && event.action.type === "error")
          notifyRateLimited(event.action.error);
      });
    const unsubscribeMutations = queryClient
      .getMutationCache()
      .subscribe((event) => {
        if (event.type === "updated" && event.action.type === "error")
          notifyRateLimited(event.action.error);
      });
    return () => {
      unsubscribeQueries();
      unsubscribeMutations();
    };
  }, [queryClient]);

  return null;
}
