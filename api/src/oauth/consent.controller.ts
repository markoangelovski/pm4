import { Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { ApiProblemResponses } from "../common/decorators/api-problem-responses/api-problem-responses.decorator.js";
import {
  type AuthUser,
  CurrentUser
} from "../common/decorators/current-user/current-user.decorator.js";
import { ConsentRequestDto, ConsentResultDto } from "./dto/consent.dto.js";
import { OAuthService } from "./oauth.service.js";

/** The consent page's endpoints (API-MCP-005…007). */
@ApiBearerAuth("bearer")
@Controller("oauth/consent")
export class ConsentController {
  constructor(private readonly service: OAuthService) {}

  @Get(":requestId")
  @ApiProblemResponses(401, 404)
  get(
    @CurrentUser() user: AuthUser,
    @Param("requestId") requestId: string
  ): Promise<ConsentRequestDto> {
    return this.service.getConsent(user.id, requestId);
  }

  @Post(":requestId/allow")
  @HttpCode(200)
  @ApiProblemResponses(401, 404, 410)
  allow(
    @CurrentUser() user: AuthUser,
    @Param("requestId") requestId: string
  ): Promise<ConsentResultDto> {
    return this.service.allow(user.id, requestId);
  }

  @Post(":requestId/deny")
  @HttpCode(200)
  @ApiProblemResponses(401, 404, 410)
  deny(
    @CurrentUser() user: AuthUser,
    @Param("requestId") requestId: string
  ): Promise<ConsentResultDto> {
    return this.service.deny(user.id, requestId);
  }
}
