import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { UsersController } from "./users.controller.js";
import { UsersService } from "./users.service.js";
import { UsersRepository } from "./users.repository.js";
import { ProjectLeadService } from "./project-lead.service.js";
import { UserSearchController } from "./user-search.controller.js";

@Module({
  imports: [DatabaseModule],
  controllers: [UsersController, UserSearchController],
  providers: [UsersService, UsersRepository, ProjectLeadService],
  exports: [UsersRepository, ProjectLeadService]
})
export class UsersModule {}
