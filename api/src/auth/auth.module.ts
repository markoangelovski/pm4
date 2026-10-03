import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { AppConfigService } from "../config/app-config.service.js";
import { AccessTokenGuard } from "../common/guards/access-token/access-token.guard.js";
import { RedisModule } from "../redis/redis.module.js";
import { UsersModule } from "../users/users.module.js";
import { AccessTokenService } from "./access-token.service.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { GoogleOidc } from "./google-oidc.js";
import { SessionStore } from "./session.store.js";

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.jwtAccessSecret,
        signOptions: {
          algorithm: "HS256",
          expiresIn: config.accessTokenTtlSeconds
        },
        verifyOptions: { algorithms: ["HS256"] }
      })
    }),
    RedisModule,
    UsersModule
  ],
  controllers: [AuthController],
  providers: [
    AccessTokenService,
    { provide: APP_GUARD, useClass: AccessTokenGuard },
    AuthService,
    GoogleOidc,
    SessionStore
  ],
  exports: [AccessTokenService]
})
export class AuthModule {}
