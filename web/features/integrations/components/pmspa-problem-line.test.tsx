import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/problem";
import { PmspaRateLimit } from "./pmspa-rate-limit";
import { PmspaProblemLine } from "./pmspa-problem-line";

const NOW = Date.parse("2026-10-18T15:00:00.000Z");
let rateLimit: {
  limit: number;
  remaining: number;
  resetAt: string;
  observedAt: string;
} | null = null;

vi.mock("../api", () => ({
  usePmspaConnection: () => ({ data: { rateLimit } }),
  useRefreshPmspaRateLimit: () => undefined
}));

const busy = (retryAfterSeconds: number) =>
  new ApiError(503, {
    type: "https://pm4.angelovski.top/problems/pmspa-rate-limited",
    title: "PMSPA is busy",
    detail: "PMSPA is busy. Try again later.",
    status: 503,
    retryAfterSeconds
  });

const spent = (resetInMs: number) => ({
  limit: 100,
  remaining: 0,
  resetAt: new Date(NOW + resetInMs).toISOString(),
  observedAt: new Date(NOW).toISOString()
});

describe("PmspaProblemLine (OQ-200)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW });
    rateLimit = null;
  });
  afterEach(() => vi.useRealTimers());

  it("counts down to the requests line's reset, minute for minute with it", () => {
    rateLimit = spent(11 * 60_000);
    render(
      <>
        <PmspaProblemLine error={busy(660)} fallback="x" />
        <PmspaRateLimit
          connection={{ rateLimit, url: "http://pmspa.test" } as never}
          tz="UTC"
        />
      </>
    );
    expect(
      screen.getByText("PMSPA is busy. Try again in 11 minutes.")
    ).toBeInTheDocument();
    expect(screen.getByText(/\(in 11 min\)/)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(3 * 60_000));
    expect(
      screen.getByText("PMSPA is busy. Try again in 8 minutes.")
    ).toBeInTheDocument();
    expect(screen.getByText(/\(in 8 min\)/)).toBeInTheDocument();
  });

  it("without a spent requests line, counts down from the error's retryAfterSeconds", () => {
    render(<PmspaProblemLine error={busy(600)} fallback="x" />);
    expect(
      screen.getByText("PMSPA is busy. Try again in 10 minutes.")
    ).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(4 * 60_000));
    expect(
      screen.getByText("PMSPA is busy. Try again in 6 minutes.")
    ).toBeInTheDocument();
  });

  it("says PMSPA calls have resumed once the reset has passed", () => {
    rateLimit = spent(60_000);
    render(<PmspaProblemLine error={busy(60)} fallback="x" />);
    act(() => vi.advanceTimersByTime(75_000));
    expect(
      screen.getByText("PMSPA calls have resumed. Try again.")
    ).toBeInTheDocument();
  });

  it("any other error: its problem line, else the fallback", () => {
    render(<PmspaProblemLine error={new Error("x")} fallback="Nope." />);
    expect(screen.getByText("Nope.")).toBeInTheDocument();
  });
});
