import { Controller, Delete, Get, HttpCode, Param } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { ApiProblemResponses } from "../common/decorators/api-problem-responses/api-problem-responses.decorator.js";
import { ConnectedAppListDto } from "./dto/connected-app.dto.js";

/** Settings → Connected apps (API-MCP-010, API-MCP-011). Stub: feat-mcp-oauth-api T4. */
@ApiBearerAuth("bearer")
@Controller("connected-apps")
export class ConnectedAppsController {
  @Get()
  @ApiProblemResponses(401)
  list(): Promise<ConnectedAppListDto> {
    throw new Error("not implemented (feat-mcp-oauth-api)");
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiProblemResponses(401, 404)
  remove(@Param("id") id: string): Promise<void> {
    void id;
    throw new Error("not implemented (feat-mcp-oauth-api)");
  }
}
