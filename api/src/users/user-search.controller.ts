import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { ApiProblemResponses } from "../common/decorators/api-problem-responses/api-problem-responses.decorator.js";
import {
  type AuthUser,
  CurrentUser
} from "../common/decorators/current-user/current-user.decorator.js";
import {
  UserSearchQueryDto,
  UserSearchResponseDto
} from "./dto/user-search.dto.js";
import { UsersService } from "./users.service.js";

/** `GET /api/v1/users` user search for the lead picker (API-USR-003). */
@ApiBearerAuth("bearer")
@Controller("users")
export class UserSearchController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiProblemResponses(400, 401)
  search(
    @CurrentUser() user: AuthUser,
    @Query() query: UserSearchQueryDto
  ): Promise<UserSearchResponseDto> {
    return this.usersService.search(user.id, query.q);
  }
}
