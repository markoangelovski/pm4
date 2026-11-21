import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Redirect,
  Req,
  UseFilters
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import type { Request } from "express";
import { Public } from "../common/decorators/public/public.decorator.js";
import { RateLimit } from "../rate-limit/rate-limits.js";
import type { RegisterResponse } from "./client-registry.js";
import { ClientRegistry } from "./client-registry.js";
import { OAuthErrorFilter } from "./oauth-error.js";
import { OAuthService, type TokenResponse } from "./oauth.service.js";

/** The OAuth endpoints the apps call, at the API's root: authorize, token, revoke and register (API-MCP-003, 004, 008, 009). */
@Public()
@ApiExcludeController()
@UseFilters(OAuthErrorFilter)
@Controller("oauth")
export class OAuthController {
  constructor(
    private readonly service: OAuthService,
    private readonly registry: ClientRegistry
  ) {}

  /** API-MCP-004: a browser navigation, always 302. */
  @Get("authorize")
  @RateLimit("oauthAuthorize")
  @Redirect()
  async authorize(
    @Req() req: Request
  ): Promise<{ url: string; statusCode: 302 }> {
    const url = await this.service.authorize(req.query);
    return { url, statusCode: 302 };
  }

  /** API-MCP-008 */
  @Post("token")
  @RateLimit("oauthToken")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  token(@Body() body: Record<string, unknown>): Promise<TokenResponse> {
    return this.service.token(body ?? {});
  }

  /** API-MCP-009 */
  @Post("revoke")
  @RateLimit("oauthToken")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  revoke(@Body() body: Record<string, unknown>): Promise<void> {
    return this.service.revoke(body ?? {});
  }

  /** API-MCP-003 */
  @Post("register")
  @RateLimit("oauthRegister")
  @HttpCode(201)
  @Header("Cache-Control", "no-store")
  register(@Body() body: unknown): Promise<RegisterResponse> {
    return this.registry.register(body);
  }
}
