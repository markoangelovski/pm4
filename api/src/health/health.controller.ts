import { Controller, Get, HttpStatus, Res } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import type { Response } from "express";
import { Public } from "../common/decorators/public/public.decorator.js";
import { HealthResult, HealthService } from "./health.service.js";

/**
 * `GET /health`: outside the `api/v1` prefix, unauthenticated, excluded from
 * Swagger and (later) rate limiting.
 */
@Public()
@ApiExcludeController()
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check(
    @Res({ passthrough: true }) res: Response
  ): Promise<HealthResult> {
    const result = await this.healthService.check();
    res.status(
      result.status === "ok" ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE
    );
    return result;
  }
}
