import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { UsersController } from "./users.controller.js";
import { UsersService } from "./users.service.js";
import { UsersRepository } from "./users.repository.js";

@Module({
  imports: [DatabaseModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersRepository]
})
export class UsersModule {}
