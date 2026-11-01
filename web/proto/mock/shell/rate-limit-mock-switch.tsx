"use client";

import { forceApiRateLimit } from "../rate-limit";

/** Prototype only: makes every API request answer 429 `rate-limited` for a while, to see the toast (OQ-256). */
export function RateLimitMockSwitch() {
  return (
    <label className="inline-flex items-center gap-1.5">
      API mock:
      <select
        className="cursor-pointer rounded border border-amber-500/40 bg-transparent px-1 py-0.5"
        defaultValue=""
        onChange={(e) => {
          const value = e.target.value;
          e.target.value = "";
          if (!value) return;
          forceApiRateLimit(value === "off" ? null : Number(value));
        }}
      >
        <option value="">rate limit…</option>
        <option value="1">Rate limited for 1 s</option>
        <option value="45">Rate limited for 45 s</option>
        <option value="off">Lift the rate limit</option>
      </select>
    </label>
  );
}
