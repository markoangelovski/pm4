import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, render } from "@testing-library/react";
import { ApiError } from "@/lib/api/problem";
import { createQueryClient } from "@/lib/query-client";
import { RateLimitNotifier } from "./rate-limit-notifier";

const toast = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() })
);
vi.mock("sonner", () => ({ toast }));

function tooManyRequests(): ApiError {
  return new ApiError(429, {
    type: "https://pm4.test/errors/rate-limited",
    title: "Too Many Requests",
    status: 429,
    detail: "Too many requests. Try again later.",
    retryAfterSeconds: 30
  });
}

describe("RateLimitNotifier (SCR-007, feat-api-rate-limit)", () => {
  beforeEach(() => {
    toast.error.mockReset();
  });

  it("AC-20 SCR-007: a failing query or mutation with a 429 shows the rate-limit toast once each; other errors and an unmounted notifier don't", async () => {
    const client = createQueryClient();
    const view = render(
      <QueryClientProvider client={client}>
        <RateLimitNotifier />
      </QueryClientProvider>
    );

    // A query failing with 429 (no retry, so one failure).
    await act(() =>
      client
        .fetchQuery({
          queryKey: ["ac-20", "query-429"],
          queryFn: () => Promise.reject(tooManyRequests()),
          retry: false
        })
        .catch(() => undefined)
    );
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenLastCalledWith(
      "Too many requests. Try again in 30 seconds.",
      { id: "rate-limited" }
    );

    // A mutation failing with 429.
    await act(() =>
      client
        .getMutationCache()
        .build(client, {
          mutationFn: () => Promise.reject(tooManyRequests())
        })
        .execute(undefined)
        .catch(() => undefined)
    );
    expect(toast.error).toHaveBeenCalledTimes(2);
    expect(toast.error).toHaveBeenLastCalledWith(
      "Too many requests. Try again in 30 seconds.",
      { id: "rate-limited" }
    );

    // A query failing with 500: the screen's own error state, no rate-limit toast.
    await act(() =>
      client
        .fetchQuery({
          queryKey: ["ac-20", "query-500"],
          queryFn: () => Promise.reject(new ApiError(500, null)),
          retry: false
        })
        .catch(() => undefined)
    );
    expect(toast.error).toHaveBeenCalledTimes(2);

    // Unmounted: no longer listening.
    view.unmount();
    await act(() =>
      client
        .fetchQuery({
          queryKey: ["ac-20", "after-unmount"],
          queryFn: () => Promise.reject(tooManyRequests()),
          retry: false
        })
        .catch(() => undefined)
    );
    expect(toast.error).toHaveBeenCalledTimes(2);
  });
});
