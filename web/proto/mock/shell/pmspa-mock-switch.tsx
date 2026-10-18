"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { PmspaConnectionStatus } from "@/proto/features/integrations/types";
import { STATUS_LABEL } from "@/proto/features/integrations/sync";
import {
  forceRateLimit,
  forceStatus,
  runOtherSync,
  sleepPmspa
} from "../pmspa";

const STATUSES = Object.keys(STATUS_LABEL) as PmspaConnectionStatus[];

/**
 * Prototype only: sets what the mock PMSPA connection is, to try every status without typing credentials.
 * **Cold start** makes the next call that reaches PMSPA wait ~9 s, like PMSPA's Azure F1 instance waking up.
 * **Next commit: another one running** makes the next import, sync or push commit answer 409 (OQ-199).
 * The **Requests** options set PMSPA's rate-limit window (100 requests per 15 minutes).
 * Logins: mock.user@pmspa.example (the links' account) or other.user@pmspa.example, any password except
 * "wrong"; a URL containing "down" is unreachable.
 */
export function PmspaMockSwitch() {
  const queryClient = useQueryClient();
  return (
    <label
      className="inline-flex items-center gap-1.5"
      title="Logins: mock.user@pmspa.example or other.user@pmspa.example, any password except “wrong”; a URL containing “down” is unreachable."
    >
      PMSPA mock:
      <select
        className="cursor-pointer rounded border border-amber-500/40 bg-transparent px-1 py-0.5"
        defaultValue=""
        onChange={(e) => {
          const value = e.target.value;
          e.target.value = "";
          if (!value) return;
          if (value === "cold-start") return sleepPmspa();
          if (value === "sync-running") return runOtherSync();
          if (value.startsWith("requests:")) {
            const used = value.slice("requests:".length);
            forceRateLimit(used === "reset" ? null : Number(used));
          } else forceStatus(value as PmspaConnectionStatus);
          void queryClient.invalidateQueries({ queryKey: ["integrations"] });
        }}
      >
        <option value="">set status…</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
        <option value="cold-start">Cold start (next call ~9 s)</option>
        <option value="sync-running">Next commit: another one running</option>
        <option value="requests:12">Requests: 12 of 100 used</option>
        <option value="requests:88">Requests: 88 of 100 used</option>
        <option value="requests:100">Requests: limit reached</option>
        <option value="requests:reset">Requests: window reset</option>
      </select>
    </label>
  );
}
