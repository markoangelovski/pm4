"use client";

import type { PmspaConnection } from "../api";

/** PMSPA's rate limit as its last answer reported it: requests used of the limit and when the window resets. */
export function PmspaRateLimit({
  connection,
  tz,
  className
}: {
  connection: PmspaConnection;
  tz: string | undefined;
  className?: string;
}): React.ReactNode {
  void connection;
  void tz;
  void className;
  throw new Error("not implemented (feat-int-budget)");
}
