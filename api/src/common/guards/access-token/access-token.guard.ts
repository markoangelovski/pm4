import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request, Response } from "express";
import type { McpAuthInfo } from "../../../mcp/mcp-tools.js";
import { AccessTokenService } from "../../../auth/access-token.service.js";
import { AuthUser } from "../../decorators/current-user/current-user.decorator.js";
import { AppConfigService } from "../../../config/app-config.service.js";
import { McpTokenService } from "../../../oauth/mcp-token.service.js";
import { OAuthStore } from "../../../oauth/oauth.store.js";
import { oauthUrls } from "../../../oauth/oauth-urls.js";
import { IS_MCP_RESOURCE_KEY } from "../../decorators/mcp-resource/mcp-resource.decorator.js";
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
    private readonly accessTokens: AccessTokenService,
    private readonly mcpTokens: McpTokenService,
    private readonly oauthStore: OAuthStore,
    private readonly config: AppConfigService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()]
    );
    if (isPublic) return true;

    const http = context.switchToHttp();
    const request = http.getRequest<
      Request & { user?: AuthUser; auth?: McpAuthInfo }
    >();
    const match = BEARER.exec(request.headers.authorization ?? "");

    const isMcp = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_MCP_RESOURCE_KEY,
      [context.getHandler(), context.getClass()]
    );
    if (isMcp) {
      const token = match ? match[1] : null;
      const claims = token ? await this.mcpTokens.verify(token) : null;
      if (!claims || (await this.oauthStore.isRevoked(claims.grantId))) {
        const { issuer } = oauthUrls(this.config);
        http
          .getResponse<Response>()
          .setHeader(
            "WWW-Authenticate",
            `Bearer resource_metadata="${issuer}/.well-known/oauth-protected-resource/mcp"` +
              (token ? ', error="invalid_token"' : "")
          );
        throw new UnauthorizedException("Missing or invalid access token.");
      }
      request.user = { id: claims.userId };
      request.auth = {
        token: token as string,
        clientId: claims.clientId,
        scopes: claims.scopes,
        extra: { userId: claims.userId, grantId: claims.grantId }
      };
      return true;
    }

    const userId = match ? await this.accessTokens.verify(match[1]) : null;
    if (!userId) {
      throw new UnauthorizedException("Missing or invalid access token.");
    }
    request.user = { id: userId };
    return true;
  }
}
