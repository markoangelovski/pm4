import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query
} from "@nestjs/common";
import { ApiBearerAuth, ApiNoContentResponse } from "@nestjs/swagger";
import { ApiProblemResponses } from "../../common/decorators/api-problem-responses/api-problem-responses.decorator.js";
import {
  type AuthUser,
  CurrentUser
} from "../../common/decorators/current-user/current-user.decorator.js";
import {
  PmspaLinkDetailDto,
  PmspaLinkListDto,
  PmspaLinkParamsDto,
  PmspaLinkTypeQueryDto
} from "./dto/pmspa-links.dto.js";
import { PmspaLinksService } from "./pmspa-links.service.js";

/** `/api/v1/integrations/pmspa/links` (API-INT-012…014). */
@ApiBearerAuth("bearer")
@Controller("integrations/pmspa")
export class PmspaLinksController {
  constructor(private readonly service: PmspaLinksService) {}

  /** The active links of a type (API-INT-012). */
  @Get("links")
  @ApiProblemResponses(400, 401)
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: PmspaLinkTypeQueryDto
  ): Promise<PmspaLinkListDto> {
    return this.service.list(user.id, query.type).then((items) => ({ items }));
  }

  /** Remove the link; both records stay (API-INT-013). */
  @Delete("links/:type/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: "Unlinked." })
  @ApiProblemResponses(400, 401, 404)
  unlink(
    @CurrentUser() user: AuthUser,
    @Param() params: PmspaLinkParamsDto
  ): Promise<void> {
    return this.service.unlink(user.id, params.type, params.id);
  }

  /** A link with its PMSPA counterpart, read live (API-INT-014). */
  @Get("links/:type/:id")
  @ApiProblemResponses(400, 401, 404, 409, 502, 503)
  detail(
    @CurrentUser() user: AuthUser,
    @Param() params: PmspaLinkParamsDto
  ): Promise<PmspaLinkDetailDto> {
    return this.service.detail(user.id, params.type, params.id);
  }
}
