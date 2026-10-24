import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query
} from "@nestjs/common";
import { ApiBearerAuth, ApiNoContentResponse } from "@nestjs/swagger";
import { ApiProblemResponses } from "../common/decorators/api-problem-responses/api-problem-responses.decorator.js";
import {
  type AuthUser,
  CurrentUser
} from "../common/decorators/current-user/current-user.decorator.js";
import { ListTodosQueryDto } from "./dto/list-todos-query.dto.js";
import { TodoInputDto } from "./dto/todo-input.dto.js";
import {
  TodoListResponseDto,
  TodoResponseDto
} from "./dto/todo-response.dto.js";
import { TodosService } from "./todos.service.js";

/** `/api/v1/todos` (API-TODO-001…004). */
@ApiBearerAuth("bearer")
@Controller("todos")
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  /** The caller's to-dos, open and done (API-TODO-001). */
  @Get()
  @ApiProblemResponses(400, 401)
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListTodosQueryDto
  ): Promise<TodoListResponseDto> {
    return this.todosService.list(user.id, query);
  }

  /** Create a to-do (API-TODO-002). */
  @Post()
  @ApiProblemResponses(400, 401, 404)
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: TodoInputDto
  ): Promise<TodoResponseDto> {
    return this.todosService.create(user.id, dto);
  }

  /** Change the given fields (API-TODO-003). */
  @Patch(":id")
  @ApiProblemResponses(400, 401, 404)
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: TodoInputDto
  ): Promise<TodoResponseDto> {
    return this.todosService.update(user.id, id, dto);
  }

  /** Delete the to-do permanently (API-TODO-004). */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: "Deleted." })
  @ApiProblemResponses(401, 404)
  remove(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string
  ): Promise<void> {
    return this.todosService.remove(user.id, id);
  }
}
