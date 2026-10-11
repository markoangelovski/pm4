import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/problem";
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
  return useQuery({
    queryKey: bookingKeys.range(from, to),
    queryFn: async ({ signal }) => {
      const data = unwrap(
        await apiClient.GET("/api/v1/bookings", {
          params: { query: { from, to } },
          signal
        })
      );
      return data.items as BookingLog[];
    }
  });
}

/** API-BOOK-002: PUT /bookings, returns data.items; invalidates bookingKeys.all and timeKeys.logs(). */
export function useSetBooking(): UseMutationResult<
  BookingLog[],
  Error,
  { logIds: string[]; bookingDate: string | null }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      logIds: string[];
      bookingDate: string | null;
    }) => {
      const data = unwrap(
        await apiClient.PUT("/api/v1/bookings", { body: input })
      );
      return data.items as BookingLog[];
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: bookingKeys.all }),
        queryClient.invalidateQueries({ queryKey: timeKeys.logs() })
      ])
  });
}
