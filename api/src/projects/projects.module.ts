import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { UsersModule } from "../users/users.module.js";
import { ProjectsController } from "./projects.controller.js";
import { ProjectsService } from "./projects.service.js";
import { ProjectsRepository } from "./projects.repository.js";

@Module({
  imports: [DatabaseModule, UsersModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsRepository],
  exports: [ProjectsService]
})
export class ProjectsModule {}
