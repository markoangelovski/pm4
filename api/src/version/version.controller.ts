import { Controller, Get } from "@nestjs/common";
import { Public } from "../common/decorators/public/public.decorator.js";
import packageJson from "../../package.json" with { type: "json" };
import { VersionResponseDto } from "./dto/version-response.dto.js";

/** `GET /api/v1/version` (API-SYS-003): public, touches neither Postgres nor Redis. */
@Public()
@Controller("version")
export class VersionController {
  @Get()
  get(): VersionResponseDto {
    return { version: packageJson.version };
  }
}
