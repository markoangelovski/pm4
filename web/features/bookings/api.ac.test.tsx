import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createQueryClient } from "@/lib/query-client";
import { timeKeys } from "@/features/time/api";
import {
  bookingKeys,
  useBookingRange,
  useSetBooking,
  type BookingLog
} from "./api";

const api = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PUT: vi.fn(),
  PATCH: vi.fn(),
  DELETE: vi.fn()
}));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

const log: BookingLog = {
  id: "l1",
  workDate: "2026-10-07",
  durationMinutes: 30,
  text: "Specs review",
  title: null,
  project: { id: "p1", title: "Manhatan", deleted: false },
  task: { id: "t1", title: "Specifications 01", deleted: false },
  excludeFromStats: false,
  bookingDate: "2026-10-07"
};

const res = (status: number) => new Response(null, { status });

function setup<T>(hook: () => T, seed?: (queryClient: QueryClient) => void) {
  const queryClient = createQueryClient();
  seed?.(queryClient);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, ...renderHook(hook, { wrapper }) };
}

const invalidated = (queryClient: QueryClient, key: readonly unknown[]) =>
  queryClient.getQueryState(key)?.isInvalidated;

describe("booking hooks (feat-book-web)", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
  });

  it("AC-6 FR-BOOK-001 FR-BOOK-004 FR-BOOK-005: GET /bookings with the range, PUT /bookings with the body, invalidation, keys under timeKeys.all", async () => {
    expect(bookingKeys.all.slice(0, timeKeys.all.length)).toEqual([
      ...timeKeys.all
    ]);
    expect(bookingKeys.range("2026-10-01", "2026-10-09")).toEqual([
      ...bookingKeys.all,
      "2026-10-01",
      "2026-10-09"
    ]);

    // useBookingRange → API-BOOK-001.
    api.GET.mockResolvedValueOnce({
      data: { items: [log] },
      response: res(200)
    });
    const range = setup(() => useBookingRange("2026-10-01", "2026-10-09"));
    await waitFor(() => expect(range.result.current.isSuccess).toBe(true));
    expect(range.result.current.data).toEqual([log]);
    expect(api.GET).toHaveBeenCalledWith(
      "/api/v1/bookings",
      expect.objectContaining({
        params: expect.objectContaining({
          query: { from: "2026-10-01", to: "2026-10-09" }
        })
      })
    );
    range.unmount();

    // useSetBooking → API-BOOK-002, then bookingKeys.all is invalidated.
    const rangeKey = bookingKeys.range("2026-10-01", "2026-10-09");
    const otherRangeKey = bookingKeys.range("2026-09-01", "2026-09-30");
    api.PUT.mockResolvedValueOnce({
      data: { items: [log] },
      response: res(200)
    });
    const set = setup(useSetBooking, (queryClient) => {
      queryClient.setQueryData(rangeKey, []);
      queryClient.setQueryData(otherRangeKey, []);
    });
    let items: BookingLog[] | undefined;
    await act(async () => {
      items = await set.result.current.mutateAsync({
        logIds: ["l1"],
        bookingDate: "2026-10-07"
      });
    });
    expect(items).toEqual([log]);
    expect(api.PUT).toHaveBeenCalledWith(
      "/api/v1/bookings",
      expect.objectContaining({
        body: { logIds: ["l1"], bookingDate: "2026-10-07" }
      })
    );
    expect(invalidated(set.queryClient, rangeKey)).toBe(true);
    expect(invalidated(set.queryClient, otherRangeKey)).toBe(true);

    // Removing a booking sends null.
    api.PUT.mockResolvedValueOnce({ data: { items: [] }, response: res(200) });
    await act(async () => {
      await set.result.current.mutateAsync({
        logIds: ["l1"],
        bookingDate: null
      });
    });
    expect(api.PUT).toHaveBeenLastCalledWith(
      "/api/v1/bookings",
      expect.objectContaining({
        body: { logIds: ["l1"], bookingDate: null }
      })
    );
  });
});
