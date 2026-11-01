import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/problem";
import { createQueryClient } from "./query-client";

/** Queries retry with the TanStack default delay (≥ 1 s): fake timers skip it. */
async function runQuery(error: ApiError): Promise<number> {
  vi.useFakeTimers();
  try {
    const client = createQueryClient();
    const queryFn = vi.fn(() => Promise.reject(error));
    const done = client
      .fetchQuery({ queryKey: ["ac-21", error.status], queryFn })
      .catch(() => undefined);
    await vi.runAllTimersAsync();
    await done;
    return queryFn.mock.calls.length;
  } finally {
    vi.useRealTimers();
  }
}

describe("createQueryClient retries (feat-api-rate-limit)", () => {
  it("AC-21 NFR-004: a query never retries a 429, retries a 500 once; a mutation never retries", async () => {
    expect(await runQuery(new ApiError(429, null))).toBe(1);
    expect(await runQuery(new ApiError(500, null))).toBe(2);

    const client = createQueryClient();
    const mutationFn = vi.fn(() => Promise.reject(new ApiError(500, null)));
    await client
      .getMutationCache()
      .build(client, { mutationFn })
      .execute(undefined)
      .catch(() => undefined);
    expect(mutationFn).toHaveBeenCalledTimes(1);
  });
});
