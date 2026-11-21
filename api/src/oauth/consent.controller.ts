import { Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { ApiProblemResponses } from "../common/decorators/api-problem-responses/api-problem-responses.decorator.js";
import { ConsentRequestDto, ConsentResultDto } from "./dto/consent.dto.js";

/** The consent page's endpoints (API-MCP-009…011). Stub: feat-mcp-oauth-api T3. */
@ApiBearerAuth("bearer")
@Controller("oauth/consent")
export class ConsentController {
  @Get(":requestId")
  @ApiProblemResponses(401, 404)
  get(@Param("requestId") requestId: string): Promise<ConsentRequestDto> {
    void requestId;
    throw new Error("not implemented (feat-mcp-oauth-api)");
  }

  @Post(":requestId/allow")
  @HttpCode(200)
  @ApiProblemResponses(401, 404, 410)
  allow(@Param("requestId") requestId: string): Promise<ConsentResultDto> {
    void requestId;
    throw new Error("not implemented (feat-mcp-oauth-api)");
  }

  @Post(":requestId/deny")
  @HttpCode(200)
  @ApiProblemResponses(401, 404, 410)
  deny(@Param("requestId") requestId: string): Promise<ConsentResultDto> {
    void requestId;
    throw new Error("not implemented (feat-mcp-oauth-api)");
  }
}
