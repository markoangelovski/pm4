import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import {
  type AuthUser,
  CurrentUser
} from "../common/decorators/current-user/current-user.decorator.js";
import { ApiProblemResponses } from "../common/decorators/api-problem-responses/api-problem-responses.decorator.js";
import { MeResponseDto } from "./dto/me-response.dto.js";
import { UsersService } from "./users.service.js";

/** `GET /api/v1/me` (API-USR-001). */
@ApiBearerAuth("bearer")
@Controller("me")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiProblemResponses(401)
  get(@CurrentUser() user: AuthUser): Promise<MeResponseDto> {
    return this.usersService.getMe(user.id);
  }
}
