"use client";

import { setMockSlowness } from "../latency";

/** Prototype only: delays every mock API response, to see loading states and the top progress bar. */
export function SlowApiMockSwitch() {
  return (
    <label className="inline-flex items-center gap-1.5">
      API speed:
      <select
        className="cursor-pointer rounded border border-amber-500/40 bg-transparent px-1 py-0.5"
        defaultValue="0"
        onChange={(e) => setMockSlowness(Number(e.target.value))}
      >
        <option value="0">Normal</option>
        <option value="1500">Slow (+1.5 s)</option>
        <option value="5000">Very slow (+5 s)</option>
      </select>
    </label>
  );
}
