import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, type ProblemDetails } from "@/lib/api/problem";
import { notifyRateLimited, rateLimitMessage, toastError } from "./rate-limit";

const toast = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() })
);
vi.mock("sonner", () => ({ toast }));

/** The API's 429 (conventions.md#errors), with `retryAfterSeconds` when given. */
function tooManyRequests(retryAfterSeconds?: unknown): ApiError {
  const problem: ProblemDetails = {
    type: "https://pm4.test/errors/rate-limited",
    title: "Too Many Requests",
    status: 429,
    detail: "Too many requests. Try again later."
  };
  if (retryAfterSeconds !== undefined)
    problem.retryAfterSeconds = retryAfterSeconds;
  return new ApiError(429, problem);
}

describe("Rate-limit messages and toasts (feat-api-rate-limit)", () => {
  beforeEach(() => {
    toast.error.mockReset();
  });

  it("AC-18 SCR-007: rateLimitMessage names the seconds from retryAfterSeconds, else 'later'", () => {
    expect(rateLimitMessage(tooManyRequests(30))).toBe(
      "Too many requests. Try again in 30 seconds."
    );
    expect(rateLimitMessage(tooManyRequests(1))).toBe(
      "Too many requests. Try again in 1 second."
    );
    for (const seconds of [undefined, 0, 1.5]) {
      expect(rateLimitMessage(tooManyRequests(seconds)), String(seconds)).toBe(
        "Too many requests. Try again later."
      );
    }
  });

  it("AC-19 SCR-007: notifyRateLimited toasts a 429 once under a fixed id; toastError skips a 429 and toasts anything else", () => {
    expect(notifyRateLimited(tooManyRequests(30))).toBe(true);
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith(
      "Too many requests. Try again in 30 seconds.",
      { id: "rate-limited" }
    );

    toast.error.mockReset();
    expect(notifyRateLimited(new ApiError(500, null))).toBe(false);
    expect(notifyRateLimited(new Error("network"))).toBe(false);
    expect(toast.error).not.toHaveBeenCalled();

    toastError(tooManyRequests(30), "Couldn't save the project.");
    expect(toast.error).not.toHaveBeenCalled();

    toastError(new ApiError(500, null), "Couldn't save the project.");
    expect(toast.error).toHaveBeenLastCalledWith("Couldn't save the project.");
    toastError(new Error("network"), "Couldn't delete the task.");
    expect(toast.error).toHaveBeenLastCalledWith("Couldn't delete the task.");
    expect(toast.error).toHaveBeenCalledTimes(2);
  });
});
