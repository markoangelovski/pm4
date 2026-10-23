import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult
} from "@tanstack/react-query";
import { apiClient } from "@/proto/mock/client";
import { unwrap } from "@/lib/api/problem";
import { timeKeys } from "@/proto/features/time/api";
import type { BookingLog } from "./days";
import type { SetBookingsDto } from "./proposed-types";

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
    queryFn: async ({ signal }) => {
      const data = unwrap(
        await apiClient.GET("/api/v1/bookings", {
          params: { query: { from, to } },
          signal
        })
      );
      return data.items as unknown as BookingLog[];
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
    mutationFn: async (input: SetBookingsDto) => {
      const data = unwrap(
        // The generated body is still SetBookingDto until the API changes (proposed-types.ts).
        await apiClient.PUT("/api/v1/bookings", { body: input as never })
      );
      return data.items as unknown as BookingLog[];
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: bookingKeys.all }),
        queryClient.invalidateQueries({ queryKey: timeKeys.logs() })
      ])
  });
}
