import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult
} from "@tanstack/react-query";
import { timeKeys } from "@/features/time/api";
import type { BookingLog, SetBookingsDto } from "./days";

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
  return useQuery({
    queryKey: bookingKeys.range(from, to),
    queryFn: async (): Promise<BookingLog[]> => {
      throw new Error("not implemented (feat-book-partial)");
    }
  });
}

/**
 * API-BOOK-002: PUT /bookings replaces each listed log's bookings (book, Book all, edit, remove), returns data.items;
 * invalidates bookingKeys.all and timeKeys.logs().
 */
export function useSetBooking(): UseMutationResult<
  BookingLog[],
  Error,
  SetBookingsDto
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<BookingLog[]> => {
      throw new Error("not implemented (feat-book-partial)");
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: bookingKeys.all }),
        queryClient.invalidateQueries({ queryKey: timeKeys.logs() })
      ])
  });
}
