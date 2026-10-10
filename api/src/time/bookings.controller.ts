import { Body, Controller, Get, HttpCode, Put, Query } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { ApiProblemResponses } from "../common/decorators/api-problem-responses/api-problem-responses.decorator.js";
import {
  type AuthUser,
  CurrentUser
} from "../common/decorators/current-user/current-user.decorator.js";
import { BookingListResponseDto } from "./dto/booking-log-response.dto.js";
import { SetBookingDto } from "./dto/set-booking.dto.js";
import { WorkdaysQueryDto } from "./dto/workdays-query.dto.js";
import { BookingsService } from "./bookings.service.js";

/** `/api/v1/bookings` (API-BOOK-001/002). */
@ApiBearerAuth("bearer")
@Controller("bookings")
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  /** The logs worked or booked in a date range (API-BOOK-001). */
  @Get()
  @ApiProblemResponses(400, 401)
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: WorkdaysQueryDto
  ): Promise<BookingListResponseDto> {
    return this.bookingsService.list(user.id, query);
  }

  /** Book, re-date or unbook one or many logs (API-BOOK-002). */
  @Put()
  @HttpCode(200)
  @ApiProblemResponses(400, 401, 404)
  set(
    @CurrentUser() user: AuthUser,
    @Body() dto: SetBookingDto
  ): Promise<BookingListResponseDto> {
    return this.bookingsService.set(user.id, dto);
  }
}
