import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put
} from "@nestjs/common";
import { ApiBearerAuth, ApiNoContentResponse } from "@nestjs/swagger";
import { ApiProblemResponses } from "../../common/decorators/api-problem-responses/api-problem-responses.decorator.js";
import {
  type AuthUser,
  CurrentUser
} from "../../common/decorators/current-user/current-user.decorator.js";
import { PmspaConnectionResponseDto } from "./dto/pmspa-connection-response.dto.js";
import { SavePmspaConnectionDto } from "./dto/save-pmspa-connection.dto.js";
import { PmspaConnectionService } from "./pmspa-connection.service.js";

/** `/api/v1/integrations/pmspa` (API-INT-001…004). */
@ApiBearerAuth("bearer")
@Controller("integrations/pmspa")
export class PmspaConnectionController {
  constructor(private readonly service: PmspaConnectionService) {}

  /** The stored connection; no PMSPA call (API-INT-001). */
  @Get()
  @ApiProblemResponses(401)
  get(@CurrentUser() user: AuthUser): Promise<PmspaConnectionResponseDto> {
    return this.service.get(user.id);
  }

  /** Save the settings, then check them (API-INT-002). */
  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiProblemResponses(400, 401, 409, 503)
  save(
    @CurrentUser() user: AuthUser,
    @Body() dto: SavePmspaConnectionDto
  ): Promise<PmspaConnectionResponseDto> {
    return this.service.save(user.id, dto);
  }

  /** Check the stored credentials again (API-INT-003). */
  @Post("test")
  @HttpCode(HttpStatus.OK)
  @ApiProblemResponses(401, 404, 503)
  test(@CurrentUser() user: AuthUser): Promise<PmspaConnectionResponseDto> {
    return this.service.test(user.id);
  }

  /** Delete the connection and the token; the links stay (API-INT-004). */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: "Disconnected." })
  @ApiProblemResponses(401)
  disconnect(@CurrentUser() user: AuthUser): Promise<void> {
    return this.service.disconnect(user.id);
  }
}
