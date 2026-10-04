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
import { CreateTaskDto } from "./dto/create-task.dto.js";
import { ListTasksQueryDto } from "./dto/list-tasks-query.dto.js";
import {
  TaskListResponseDto,
  TaskResponseDto
} from "./dto/task-response.dto.js";
import { UpdateTaskDto } from "./dto/update-task.dto.js";
import { TasksService } from "./tasks.service.js";

/** `/api/v1/tasks` (API-TSK-001…006). A trashed task → `404 in-trash`. */
@ApiBearerAuth("bearer")
@Controller("tasks")
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  /** Create a task (API-TSK-001). */
  @Post()
  @ApiProblemResponses(400, 401)
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTaskDto
  ): Promise<TaskResponseDto> {
    return this.tasksService.create(user.id, dto);
  }

  /** The caller's tasks, optionally filtered by project and status (API-TSK-002). */
  @Get()
  @ApiProblemResponses(400, 401)
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListTasksQueryDto
  ): Promise<TaskListResponseDto> {
    return this.tasksService.list(user.id, query);
  }

  /** One task (API-TSK-003). */
  @Get(":id")
  @ApiProblemResponses(401, 404)
  get(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string
  ): Promise<TaskResponseDto> {
    return this.tasksService.get(user.id, id);
  }

  /** Change the given fields (API-TSK-004). */
  @Patch(":id")
  @ApiProblemResponses(400, 401, 404)
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateTaskDto
  ): Promise<TaskResponseDto> {
    return this.tasksService.update(user.id, id, dto);
  }

  /** Move the task to the trash (API-TSK-005). */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: "Moved to the trash." })
  @ApiProblemResponses(401, 404)
  remove(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string
  ): Promise<void> {
    return this.tasksService.remove(user.id, id);
  }

  /** Take the task out of the trash (API-TSK-006). */
  @Post(":id/restore")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: "Restored, or already active." })
  @ApiProblemResponses(401, 404, 409)
  restore(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string
  ): Promise<void> {
    return this.tasksService.restore(user.id, id);
  }
}
