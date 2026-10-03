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
import { CreateProjectDto } from "./dto/create-project.dto.js";
import { ListProjectsQueryDto } from "./dto/list-projects-query.dto.js";
import {
  ProjectListResponseDto,
  ProjectResponseDto
} from "./dto/project-response.dto.js";
import { UpdateProjectDto } from "./dto/update-project.dto.js";
import { ProjectsService } from "./projects.service.js";

/** `/api/v1/projects` (API-PRJ-001…006). A trashed project → `404 in-trash`. */
@ApiBearerAuth("bearer")
@Controller("projects")
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /** Create a project (API-PRJ-001). */
  @Post()
  @ApiProblemResponses(400, 401)
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateProjectDto
  ): Promise<ProjectResponseDto> {
    return this.projectsService.create(user.id, dto);
  }

  /** The caller's projects that aren't in the trash (API-PRJ-002). */
  @Get()
  @ApiProblemResponses(400, 401)
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListProjectsQueryDto
  ): Promise<ProjectListResponseDto> {
    return this.projectsService.list(user.id, query);
  }

  /** One project (API-PRJ-003). */
  @Get(":id")
  @ApiProblemResponses(401, 404)
  get(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string
  ): Promise<ProjectResponseDto> {
    return this.projectsService.get(user.id, id);
  }

  /** Change the given fields (API-PRJ-004). */
  @Patch(":id")
  @ApiProblemResponses(400, 401, 404)
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateProjectDto
  ): Promise<ProjectResponseDto> {
    return this.projectsService.update(user.id, id, dto);
  }

  /** Move the project to the trash (API-PRJ-005). */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: "Moved to the trash." })
  @ApiProblemResponses(401, 404)
  remove(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string
  ): Promise<void> {
    return this.projectsService.remove(user.id, id);
  }

  /** Take the project out of the trash (API-PRJ-006). */
  @Post(":id/restore")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: "Restored, or already active." })
  @ApiProblemResponses(401, 404)
  restore(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string
  ): Promise<void> {
    return this.projectsService.restore(user.id, id);
  }
}
