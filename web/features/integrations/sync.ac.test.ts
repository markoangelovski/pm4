import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { ApiError } from "@/lib/api/problem";
import {
  pmspaProblemText,
  STATUS_LABEL,
  syncedLine,
  useSlowPmspa
} from "./sync";

const problem = (
  status: number,
  slug: string,
  extensions: Record<string, unknown> = {}
) =>
  new ApiError(status, {
    type: `https://pm4.angelovski.top/errors/${slug}`,
    title: "Error",
    status,
    detail: "Error.",
    ...extensions
  });

afterEach(() => {
  vi.useRealTimers();
});

describe("pmspaProblemText (feat-int-web D3, OQ-182)", () => {
  it("AC-4 FR-INT-014: a line for each PMSPA problem, null for anything else", () => {
    expect(
      pmspaProblemText(
        problem(503, "pmspa-rate-limited", { retryAfterSeconds: 600 })
      )
    ).toBe("PMSPA is busy. Try again in 10 minutes.");
    expect(
      pmspaProblemText(
        problem(503, "pmspa-rate-limited", { retryAfterSeconds: 30 })
      )
    ).toBe("PMSPA is busy. Try again in 1 minute.");
    expect(pmspaProblemText(problem(503, "pmspa-rate-limited"))).toBe(
      "PMSPA is busy. Try again in 15 minutes."
    );
    expect(pmspaProblemText(problem(409, "pmspa-sync-running"))).toBe(
      "Another import, sync or push is still running."
    );
    expect(pmspaProblemText(problem(409, "pmspa-invalid-credentials"))).toBe(
      "PMSPA rejected the saved email or password."
    );
    expect(pmspaProblemText(problem(502, "pmspa-unreachable"))).toBe(
      "PMSPA couldn't be reached."
    );
    expect(pmspaProblemText(problem(500, "internal"))).toBeNull();
    expect(pmspaProblemText(new ApiError(503, null))).toBeNull();
    expect(pmspaProblemText(new Error("network"))).toBeNull();
    expect(pmspaProblemText(undefined)).toBeNull();
  });
});

describe("Sync labels and the slow-call hint (feat-int-web)", () => {
  it("AC-5 FR-INT-010, FR-INT-004, FR-INT-013: syncedLine in the user's zone, STATUS_LABEL, useSlowPmspa after 3 s", () => {
    expect(
      syncedLine("imported", "2026-10-15T20:50:00Z", "Europe/Zagreb")
    ).toBe("Synced from PMSPA on 15 October 2026 at 22:50");
    expect(STATUS_LABEL).toEqual({
      "not-configured": "Not configured",
      connected: "Connected",
      "invalid-credentials": "Invalid credentials",
      unreachable: "Unreachable"
    });

    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ active }) => useSlowPmspa(active),
      { initialProps: { active: true } }
    );
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(2999));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(true);
    rerender({ active: false });
    expect(result.current).toBe(false);
  });
});
