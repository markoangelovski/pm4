import { Controller, Get } from "@nestjs/common";
import { ApiProblemResponsesNotLimited } from "../common/decorators/api-problem-responses/api-problem-responses.decorator.js";
import { Public } from "../common/decorators/public/public.decorator.js";
import { NoRateLimit } from "../rate-limit/rate-limits.js";
import type { ChangelogResponseDto } from "./dto/changelog-response.dto.js";
import { readChangelog } from "./read-changelog.js";

/** `GET /api/v1/changelog` (API-SYS-004): public, read once at startup, touches neither Postgres nor Redis. */
@Public()
@NoRateLimit()
@Controller("changelog")
export class ChangelogController {
  private readonly changelog = readChangelog();

  @Get()
  @ApiProblemResponsesNotLimited()
  get(): ChangelogResponseDto {
    return this.changelog;
  }
}
