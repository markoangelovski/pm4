import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Redirect,
  Req
} from "@nestjs/common";
import { ApiBearerAuth, ApiFoundResponse, ApiQuery } from "@nestjs/swagger";
import type { Request } from "express";
import {
  type AuthUser,
  CurrentUser
} from "../common/decorators/current-user/current-user.decorator.js";
import { Public } from "../common/decorators/public/public.decorator.js";
import { AuthService } from "./auth.service.js";
import { CodeRequestDto } from "./dto/code-request.dto.js";
import { RefreshTokenRequestDto } from "./dto/refresh-token-request.dto.js";
import { TokenPairDto } from "./dto/token-pair.dto.js";

interface RedirectTo {
  url: string;
  statusCode: 302;
}

/** API-AUTH-001…006: Google sign-in, login codes, refresh and sign-out. */
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** API-AUTH-001: start Google sign-in (a browser navigation). */
  @Public()
  @Get("google")
  @Redirect()
  @ApiQuery({ name: "returnTo", required: false, type: String })
  @ApiQuery({ name: "timeZone", required: false, type: String })
  @ApiFoundResponse({
    description: "Redirect to Google's authorization endpoint."
  })
  async start(
    @Query("returnTo") returnTo?: string,
    @Query("timeZone") timeZone?: string
  ): Promise<RedirectTo> {
    const url = await this.authService.start(returnTo, timeZone);
    return { url, statusCode: 302 };
  }

  /** API-AUTH-002: Google's callback; always redirects to the web app. */
  @Public()
  @Get("google/callback")
  @Redirect()
  @ApiFoundResponse({
    description:
      "Redirect to `<WEB_APP_URL>/auth/callback?code=…` or `/auth/sign-in?error=…`."
  })
  async callback(@Req() req: Request): Promise<RedirectTo> {
    const index = req.originalUrl.indexOf("?");
    const rawQuery = index === -1 ? "" : req.originalUrl.slice(index + 1);
    const url = await this.authService.callback(req.query, rawQuery);
    return { url, statusCode: 302 };
  }

  /** API-AUTH-003: exchange the login code for a token pair. */
  @Public()
  @Post("token")
  @HttpCode(200)
  token(@Body() body: CodeRequestDto): Promise<TokenPairDto> {
    return this.authService.exchangeCode(body.code);
  }

  /** API-AUTH-004: rotate the refresh token. */
  @Public()
  @Post("refresh")
  @HttpCode(200)
  refresh(@Body() body: RefreshTokenRequestDto): Promise<TokenPairDto> {
    return this.authService.refresh(body.refreshToken);
  }

  /** API-AUTH-005: sign out of this session. */
  @Public()
  @Post("logout")
  @HttpCode(204)
  logout(@Body() body: RefreshTokenRequestDto): Promise<void> {
    return this.authService.logout(body.refreshToken);
  }

  /** API-AUTH-006: sign out of every session. */
  @ApiBearerAuth("bearer")
  @Post("logout-all")
  @HttpCode(204)
  logoutAll(@CurrentUser() user: AuthUser): Promise<void> {
    return this.authService.logoutAll(user.id);
  }
}
