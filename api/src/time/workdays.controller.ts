import { Body, Controller, Get, Param, Put, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiParam } from "@nestjs/swagger";
import { ApiProblemResponses } from "../common/decorators/api-problem-responses/api-problem-responses.decorator.js";
import {
  type AuthUser,
  CurrentUser
} from "../common/decorators/current-user/current-user.decorator.js";
import { SetWorkdayDto } from "./dto/set-workday.dto.js";
import {
  DayResponseDto,
  WorkdayListResponseDto,
  WorkdayResponseDto
} from "./dto/workday-response.dto.js";
import { WorkdaysQueryDto } from "./dto/workdays-query.dto.js";
import { WorkdaysService } from "./workdays.service.js";

/** `/api/v1/workdays` (API-WD-001…003). */
@ApiBearerAuth("bearer")
@Controller("workdays")
export class WorkdaysController {
  constructor(private readonly workdaysService: WorkdaysService) {}

  /** The workdays in a date range (API-WD-001). */
  @Get()
  @ApiProblemResponses(400, 401)
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: WorkdaysQueryDto
  ): Promise<WorkdayListResponseDto> {
    return this.workdaysService.list(user.id, query);
  }

  /** A whole day: start, total and logs (API-WD-003). */
  @Get(":date")
  @ApiParam({ name: "date", type: String, format: "date" })
  @ApiProblemResponses(400, 401)
  getDay(
    @CurrentUser() user: AuthUser,
    @Param("date") date: string
  ): Promise<DayResponseDto> {
    return this.workdaysService.getDay(user.id, date);
  }

  /** Set the day start (API-WD-002). */
  @Put(":date")
  @ApiParam({ name: "date", type: String, format: "date" })
  @ApiProblemResponses(400, 401)
  setStart(
    @CurrentUser() user: AuthUser,
    @Param("date") date: string,
    @Body() dto: SetWorkdayDto
  ): Promise<WorkdayResponseDto> {
    return this.workdaysService.setStart(user.id, date, dto.startMinute);
  }
}
