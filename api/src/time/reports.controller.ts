import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse } from "@nestjs/swagger";
import { ApiProblemResponses } from "../common/decorators/api-problem-responses/api-problem-responses.decorator.js";
import {
  type AuthUser,
  CurrentUser
} from "../common/decorators/current-user/current-user.decorator.js";
import { DashboardReportResponseDto } from "./dto/dashboard-report-response.dto.js";
import { WorkdaysQueryDto } from "./dto/workdays-query.dto.js";
import { ReportsService } from "./reports.service.js";

/** `/api/v1/reports` (API-RPT-001). */
@ApiBearerAuth("bearer")
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /** Worked and booked minutes per day and per project in a date range (API-RPT-001). */
  @Get("dashboard")
  @ApiOkResponse({ type: DashboardReportResponseDto })
  @ApiProblemResponses(400, 401)
  dashboard(
    @CurrentUser() user: AuthUser,
    @Query() query: WorkdaysQueryDto
  ): Promise<DashboardReportResponseDto> {
    return this.reportsService.dashboard(user.id, query);
  }
}
