import { Module } from "@nestjs/common";
import { ConfigModule } from "./config/config.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { RedisModule } from "./redis/redis.module.js";
import { HealthModule } from "./health/health.module.js";
import { ProblemDetailsFilter } from "./common/filters/problem-details/problem-details.filter.js";
import { VersionModule } from "./version/version.module.js";

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    RedisModule,
    HealthModule,
    VersionModule
  ],
  providers: [ProblemDetailsFilter]
})
export class AppModule {}
