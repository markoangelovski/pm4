"use client";

import { useState } from "react";
import { usePmspaConnection } from "../api";
import {
  minutesUntil,
  pmspaBusyText,
  pmspaProblemText,
  pmspaRetryAfterSeconds,
  usePmspaNow
} from "../sync";

/**
 * OQ-182's line for a PMSPA problem shown on screen (not in a toast), or `fallback`. A rate limit counts
 * down on the shared PMSPA clock to the requests line's reset, so both show the same minutes (OQ-200).
 */
export function PmspaProblemLine({
  error,
  fallback
}: {
  error: unknown;
  fallback: string;
}) {
  const retry = pmspaRetryAfterSeconds(error);
  if (retry === null) return <>{pmspaProblemText(error) ?? fallback}</>;
  return <PmspaBusyLine retryAfterSeconds={retry} />;
}

/**
 * "PMSPA is busy. Try again in N minutes." until the requests line's reset while it shows the limit reached,
 * else `retryAfterSeconds` after the error; then that PMSPA calls have resumed (nothing is retried, OQ-177).
 */
function PmspaBusyLine({ retryAfterSeconds }: { retryAfterSeconds: number }) {
  const rateLimit = usePmspaConnection().data?.rateLimit;
  const now = usePmspaNow();
  const [failedAt] = useState(now);
  const resumeAt =
    rateLimit && rateLimit.remaining === 0
      ? Date.parse(rateLimit.resetAt)
      : failedAt + retryAfterSeconds * 1000;
  if (now >= resumeAt) return <>PMSPA calls have resumed. Try again.</>;
  return <>{pmspaBusyText(minutesUntil(resumeAt, now))}</>;
}
