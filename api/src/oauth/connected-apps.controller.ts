import {
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param
} from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { ApiProblemResponses } from "../common/decorators/api-problem-responses/api-problem-responses.decorator.js";
import {
  type AuthUser,
  CurrentUser
} from "../common/decorators/current-user/current-user.decorator.js";
import { ConnectedAppListDto } from "./dto/connected-app.dto.js";
import { GrantsService } from "./grants.service.js";

/** Settings → Connected apps (API-MCP-010, API-MCP-011). */
@ApiBearerAuth("bearer")
@Controller("connected-apps")
export class ConnectedAppsController {
  constructor(private readonly grants: GrantsService) {}

  @Get()
  @ApiProblemResponses(401)
  async list(@CurrentUser() user: AuthUser): Promise<ConnectedAppListDto> {
    return { items: await this.grants.list(user.id) };
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiProblemResponses(401, 404)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string
  ): Promise<void> {
    if (!(await this.grants.deleteGrant(user.id, id)))
      throw new NotFoundException("Connected app not found.");
  }
}
