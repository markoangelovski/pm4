import { Global, Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";
import { APP_ENV, AppConfigService } from "./app-config.service.js";
import { validateEnv } from "./env.schema.js";

@Global()
@Module({
  imports: [
    // Only loads api/.env into process.env (no `validate`: it would write
    // parsed values back into process.env, see APP_ENV). Real env vars
    // (Azure App Settings, CI) take precedence. Tests ignore the file so they
    // only see the env they set themselves.
    NestConfigModule.forRoot({
      ignoreEnvFile: process.env.NODE_ENV === "test"
    })
  ],
  providers: [
    {
      provide: APP_ENV,
      // Parsed once per app, at boot: an invalid env still fails fast
      // (module compilation rejects with validateEnv's error).
      useFactory: async () => {
        await NestConfigModule.envVariablesLoaded;
        return validateEnv(process.env);
      }
    },
    AppConfigService
  ],
  exports: [AppConfigService]
})
export class ConfigModule {}
