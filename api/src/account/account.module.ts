import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PmspaModule } from "../integrations/pmspa/pmspa.module.js";
import { UsersModule } from "../users/users.module.js";
import { AccountController } from "./account.controller.js";
import { AccountService } from "./account.service.js";

@Module({
  imports: [UsersModule, AuthModule, PmspaModule],
  controllers: [AccountController],
  providers: [AccountService]
})
export class AccountModule {}
