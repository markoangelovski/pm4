"use client";

import { useEffect } from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { ProgressProvider, useProgress } from "@bprogress/react";

/** A request that answers sooner than this never shows the bar, so fast screens don't flicker. */
const SHOW_AFTER_MS = 200;

/** Runs the bar while any query or mutation is in flight; it trickles forward on its own until the last one ends. */
function ApiActivity() {
  const busy = useIsFetching() + useIsMutating() > 0;
  const { start, stop } = useProgress();

  useEffect(() => {
    if (busy) start(0, SHOW_AFTER_MS);
    else stop();
  }, [busy, start, stop]);

  return null;
}

/**
 * GitHub-style loading bar at the top of the window while the API is answering (queries and mutations,
 * background refetches included). Page navigation doesn't start it: a static-export route change is instant,
 * and the new page's requests show it.
 */
export function ApiProgressBar() {
  return (
    <ProgressProvider
      color="var(--primary)"
      height="3px"
      options={{ showSpinner: false }}
    >
      <ApiActivity />
    </ProgressProvider>
  );
}
