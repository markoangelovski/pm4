import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Post,
  Req,
  Res
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { McpResource } from "../common/decorators/mcp-resource/mcp-resource.decorator.js";
import { AppConfigService } from "../config/app-config.service.js";
import { RateLimit } from "../rate-limit/rate-limits.js";
import { McpService } from "./mcp.service.js";

/** `POST /mcp` (API-MCP-012): the MCP endpoint; `GET` and `DELETE` are `405`. */
@ApiExcludeController()
@McpResource()
@RateLimit("mcp")
@Controller("mcp")
export class McpController {
  constructor(
    private readonly mcp: McpService,
    private readonly config: AppConfigService
  ) {}

  @Post()
  async handle(@Req() req: Request, @Res() res: Response): Promise<void> {
    const origin = req.headers.origin;
    if (origin !== undefined && !this.config.corsOrigins.includes(origin)) {
      throw new ForbiddenException("Origin not allowed.");
    }
    await this.mcp.handle(req, res);
  }

  @Get()
  get(@Res() res: Response): void {
    this.notAllowed(res);
  }

  @Delete()
  delete(@Res() res: Response): void {
    this.notAllowed(res);
  }

  private notAllowed(res: Response): void {
    res
      .status(405)
      .setHeader("Allow", "POST")
      .json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Method not allowed." },
        id: null
      });
  }
}
