import { Controller, Get } from "@nestjs/common";
import { ApiProblemResponsesNotLimited } from "../common/decorators/api-problem-responses/api-problem-responses.decorator.js";
import { Public } from "../common/decorators/public/public.decorator.js";
import { NoRateLimit } from "../rate-limit/rate-limits.js";
import packageJson from "../../package.json" with { type: "json" };
import { VersionResponseDto } from "./dto/version-response.dto.js";

/** `GET /api/v1/version` (API-SYS-003): public, touches neither Postgres nor Redis. */
@Public()
@NoRateLimit()
@Controller("version")
export class VersionController {
  @Get()
  @ApiProblemResponsesNotLimited()
  get(): VersionResponseDto {
    return { version: packageJson.version };
  }
}
