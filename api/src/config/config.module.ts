import { Global, Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";
import { AppConfigService } from "./app-config.service.js";
import { validateEnv } from "./env.schema.js";

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      // Local dev reads api/.env; real env vars (Azure App Settings, CI) take precedence.
      // Tests ignore it so they only see the env they set themselves.
      ignoreEnvFile: process.env.NODE_ENV === "test"
    })
  ],
  providers: [AppConfigService],
  exports: [AppConfigService]
})
export class ConfigModule {}
