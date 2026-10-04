import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { UsersModule } from "../users/users.module.js";
import { ProjectsModule } from "../projects/projects.module.js";
import { TasksController } from "./tasks.controller.js";
import { TasksService } from "./tasks.service.js";
import { TasksRepository } from "./tasks.repository.js";

@Module({
  imports: [DatabaseModule, UsersModule, ProjectsModule],
  controllers: [TasksController],
  providers: [TasksService, TasksRepository],
  exports: [TasksService]
})
export class TasksModule {}
