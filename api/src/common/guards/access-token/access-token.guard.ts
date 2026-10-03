import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { AccessTokenService } from "../../../auth/access-token.service.js";
import { AuthUser } from "../../decorators/current-user/current-user.decorator.js";
import { IS_PUBLIC_KEY } from "../../decorators/public/public.decorator.js";

const BEARER = /^Bearer\s+(\S+)$/i;

/**
 * Global default-deny guard (registered as `APP_GUARD` in `AuthModule`):
 * every route needs a valid access token unless marked `@Public()`.
 */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessTokens: AccessTokenService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()]
    );
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const match = BEARER.exec(request.headers.authorization ?? "");
    const userId = match ? await this.accessTokens.verify(match[1]) : null;
    if (!userId) {
      throw new UnauthorizedException("Missing or invalid access token.");
    }
    request.user = { id: userId };
    return true;
  }
}
