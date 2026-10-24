import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { ProjectsModule } from "../projects/projects.module.js";
import { TasksModule } from "../tasks/tasks.module.js";
import { UsersModule } from "../users/users.module.js";
import { ItemLinkService } from "./item-link.service.js";
import { NotesController } from "./notes.controller.js";
import { NotesService } from "./notes.service.js";
import { TodosController } from "./todos.controller.js";
import { TodosService } from "./todos.service.js";

@Module({
  imports: [DatabaseModule, UsersModule, ProjectsModule, TasksModule],
  controllers: [NotesController, TodosController],
  providers: [NotesService, TodosService, ItemLinkService]
})
export class NotesModule {}
