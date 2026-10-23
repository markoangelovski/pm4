// Partial bookings: API shapes the screen needs that `schema.d.ts` doesn't have yet (specs/04-web/prototype.md).
// They replace `bookingDate` on BookingLogResponseDto and the `SetBookingDto` body; `npm run api:types` replaces them.
import type { components } from "@/lib/api/schema";

type S = components["schemas"];

/** One part of a log's time booked to a date: 15-minute steps, at most one per date and log. */
export interface BookingDto {
  /** `YYYY-MM-DD`, not after today. */
  date: string;
  minutes: number;
}

/** A time log with its bookings, by date ascending; [] = not booked. Their minutes add up to at most the log's duration. */
export type BookingLogResponseDto = S["TimeLogResponseDto"] & {
  bookings: BookingDto[];
};

/** PUT /bookings: each listed log's bookings are replaced by the given list ([] = unbooked), all or nothing. */
export interface SetBookingsDto {
  logs: { logId: string; bookings: BookingDto[] }[];
}

export interface BookingListResponseDto {
  items: BookingLogResponseDto[];
}

/** API-TLOG-001 with the bookings on each item; `bookedMinutes` sums the booked minutes. */
export type TimeLogListResponseDto = Omit<
  S["TimeLogListResponseDto"],
  "items"
> & { items: BookingLogResponseDto[] };
