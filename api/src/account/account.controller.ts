import { Controller, Delete, HttpCode } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { ApiProblemResponses } from "../common/decorators/api-problem-responses/api-problem-responses.decorator.js";
import {
  type AuthUser,
  CurrentUser
} from "../common/decorators/current-user/current-user.decorator.js";
import { AccountService } from "./account.service.js";

/** `DELETE /api/v1/me` (API-USR-004). `GET`/`PATCH /me` are in `UsersController`. */
@ApiBearerAuth("bearer")
@Controller("me")
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  /** Delete the account and all of its data, permanently. */
  @Delete()
  @HttpCode(204)
  @ApiProblemResponses(401)
  remove(@CurrentUser() user: AuthUser): Promise<void> {
    return this.accountService.deleteAccount(user.id);
  }
}
