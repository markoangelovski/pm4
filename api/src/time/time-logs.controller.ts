import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post
} from "@nestjs/common";
import { ApiBearerAuth, ApiNoContentResponse } from "@nestjs/swagger";
import { ApiProblemResponses } from "../common/decorators/api-problem-responses/api-problem-responses.decorator.js";
import {
  type AuthUser,
  CurrentUser
} from "../common/decorators/current-user/current-user.decorator.js";
import { CreateTimeLogDto } from "./dto/create-time-log.dto.js";
import { TimeLogResponseDto } from "./dto/time-log-response.dto.js";
import { UpdateTimeLogDto } from "./dto/update-time-log.dto.js";
import { TimeLogsService } from "./time-logs.service.js";

/** `/api/v1/time-logs` (API-TLOG-002/004/006). */
@ApiBearerAuth("bearer")
@Controller("time-logs")
export class TimeLogsController {
  constructor(private readonly timeLogsService: TimeLogsService) {}

  /** Create a time log (API-TLOG-002). */
  @Post()
  @ApiProblemResponses(400, 401, 404)
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTimeLogDto
  ): Promise<TimeLogResponseDto> {
    return this.timeLogsService.create(user.id, dto);
  }

  /** Change the given fields (API-TLOG-004). */
  @Patch(":id")
  @ApiProblemResponses(400, 401, 404)
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateTimeLogDto
  ): Promise<TimeLogResponseDto> {
    return this.timeLogsService.update(user.id, id, dto);
  }

  /** Delete a time log (API-TLOG-006). */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: "Deleted." })
  @ApiProblemResponses(401, 404)
  remove(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string
  ): Promise<void> {
    return this.timeLogsService.remove(user.id, id);
  }
}
