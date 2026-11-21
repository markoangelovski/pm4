import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { DatabaseModule } from "../database/database.module.js";
import { RateLimitModule } from "../rate-limit/rate-limit.module.js";
import { RedisModule } from "../redis/redis.module.js";
import { UsersModule } from "../users/users.module.js";
import { CimdFetcher } from "./cimd-fetcher.js";
import { ClientRegistry } from "./client-registry.js";
import { ConnectedAppsController } from "./connected-apps.controller.js";
import { ConsentController } from "./consent.controller.js";
import { GrantsRepository } from "./grants.repository.js";
import { GrantsService } from "./grants.service.js";
import { McpTokenService } from "./mcp-token.service.js";
import { OAuthController } from "./oauth.controller.js";
import { OAuthMetadataController } from "./oauth-metadata.controller.js";
import { OAuthService } from "./oauth.service.js";
import { OAuthStore } from "./oauth.store.js";

/** OAuth authorization server, consent, Connected apps and authorization-server metadata (feat-mcp-oauth-api). */
@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({}),
    RateLimitModule,
    RedisModule,
    UsersModule
  ],
  controllers: [
    OAuthController,
    ConsentController,
    ConnectedAppsController,
    OAuthMetadataController
  ],
  providers: [
    CimdFetcher,
    ClientRegistry,
    GrantsRepository,
    GrantsService,
    McpTokenService,
    OAuthService,
    OAuthStore
  ],
  exports: [McpTokenService, OAuthStore, GrantsService]
})
export class OAuthModule {}
