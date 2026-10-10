import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { timeKeys } from "@/features/time/api";
import type { BookingLog } from "./days";

export type { BookingLog } from "./days";

/** Under timeKeys.all, so every time-log mutation also refreshes Bookings (D4). */
export const bookingKeys = {
  all: [...timeKeys.all, "bookings"] as const,
  range: (from: string, to: string) => [...bookingKeys.all, from, to] as const
};

/** API-BOOK-001: GET /bookings?from=&to=, returns data.items. */
export function useBookingRange(
  from: string,
  to: string
): UseQueryResult<BookingLog[], Error> {
  void from;
  void to;
  throw new Error("not implemented (feat-book-web)");
}

/** API-BOOK-002: PUT /bookings, returns data.items; invalidates bookingKeys.all. */
export function useSetBooking(): UseMutationResult<
  BookingLog[],
  Error,
  { logIds: string[]; bookingDate: string | null }
> {
  throw new Error("not implemented (feat-book-web)");
}
