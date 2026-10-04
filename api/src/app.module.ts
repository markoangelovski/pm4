import { Module } from "@nestjs/common";
import { ConfigModule } from "./config/config.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { RedisModule } from "./redis/redis.module.js";
import { HealthModule } from "./health/health.module.js";
import { ProblemDetailsFilter } from "./common/filters/problem-details/problem-details.filter.js";
import { VersionModule } from "./version/version.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { UsersModule } from "./users/users.module.js";
import { ProjectsModule } from "./projects/projects.module.js";
import { TasksModule } from "./tasks/tasks.module.js";

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    RedisModule,
    HealthModule,
    VersionModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    TasksModule
  ],
  providers: [ProblemDetailsFilter]
})
export class AppModule {}
