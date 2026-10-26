import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { isUUID } from "class-validator";
import { ProjectLeadService } from "../users/project-lead.service.js";
import { CreateProjectDto } from "./dto/create-project.dto.js";
import { ListProjectsQueryDto } from "./dto/list-projects-query.dto.js";
import {
  ProjectListResponseDto,
  ProjectResponseDto
} from "./dto/project-response.dto.js";
import { ServiceNamesResponseDto } from "./dto/project-service.dto.js";
import { UpdateProjectDto } from "./dto/update-project.dto.js";
import {
  type ProjectRow,
  type ProjectServiceRow,
  type ProjectValues,
  ProjectsRepository
} from "./projects.repository.js";

/** Projects (API-PRJ-001…005), always the caller's own. */
@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly projectLeadService: ProjectLeadService
  ) {}

  async create(
    userId: string,
    dto: CreateProjectDto
  ): Promise<ProjectResponseDto> {
    const lead = (await this.projectLeadService.toColumns(dto, false))!;
    const id = await this.projectsRepository.insert(
      userId,
      {
        title: dto.title,
        description: dto.description ?? null,
        externalLink: dto.externalLink ?? null,
        ...lead
      },
      dto.services ?? []
    );
    return this.get(userId, id);
  }

  async list(
    userId: string,
    query: ListProjectsQueryDto
  ): Promise<ProjectListResponseDto> {
    const { page, pageSize, sort } = query;
    const { rows, total } = await this.projectsRepository.list(
      userId,
      query.q || null,
      sort,
      page,
      pageSize
    );
    const services = await this.projectsRepository.servicesOf(
      userId,
      rows.map((r) => r.id)
    );
    return {
      items: rows.map((row) =>
        this.toDto(
          row,
          services.filter((s) => s.projectId === row.id)
        )
      ),
      page,
      pageSize,
      total
    };
  }

  async get(userId: string, id: string): Promise<ProjectResponseDto> {
    const row = await this.findOwned(userId, id);
    return this.toDto(
      row,
      await this.projectsRepository.servicesOf(userId, [id])
    );
  }

  /** Changes only the given fields; always sets `updatedAt` to now. */
  async update(
    userId: string,
    id: string,
    dto: UpdateProjectDto
  ): Promise<ProjectResponseDto> {
    await this.findOwned(userId, id);
    const lead = await this.projectLeadService.toColumns(dto, true);
    const values: Partial<ProjectValues> = { ...lead };
    if (dto.title !== undefined) values.title = dto.title;
    if (dto.description !== undefined) values.description = dto.description;
    if (dto.externalLink !== undefined) values.externalLink = dto.externalLink;
    await this.projectsRepository.update(userId, id, values, dto.services);
    return this.get(userId, id);
  }

  /** Deletes the project and its tasks permanently (API-PRJ-005). */
  async remove(userId: string, id: string): Promise<void> {
    if (!isUUID(id) || !(await this.projectsRepository.delete(userId, id))) {
      throw new NotFoundException("Project not found.");
    }
  }

  /** Every service name on the caller's projects (API-PRJ-006). */
  serviceNames(userId: string): Promise<ServiceNamesResponseDto> {
    return this.projectsRepository
      .serviceNames(userId)
      .then((items) => ({ items }));
  }

  /** `400` on `serviceId` unless it is a service of the caller's project. */
  async assertService(
    userId: string,
    projectId: string,
    serviceId: string
  ): Promise<void> {
    if (
      !(await this.projectsRepository.hasService(userId, projectId, serviceId))
    ) {
      throw new BadRequestException({
        errors: [
          {
            field: "serviceId",
            message: "must be one of the project's services"
          }
        ]
      });
    }
  }

  /**
   * The caller's project by id (shared with feat-tsk-api). A non-UUID or
   * missing id → `404 not-found` (D11).
   */
  async findOwned(userId: string, id: string): Promise<ProjectRow> {
    const project = isUUID(id)
      ? await this.projectsRepository.findById(userId, id)
      : null;
    if (!project) {
      throw new NotFoundException("Project not found.");
    }
    return project;
  }

  private toDto(
    row: ProjectRow,
    services: ProjectServiceRow[]
  ): ProjectResponseDto {
    const { upcoming, inProgress, completed } = row.counts;
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      externalLink: row.externalLink,
      projectLead: this.projectLeadService.toDto(row),
      services: services.map(({ id, name, taskCount }) => ({
        id,
        name,
        taskCount
      })),
      taskCounts: {
        upcoming,
        inProgress,
        completed,
        total: upcoming + inProgress + completed
      },
      loggedMinutes: row.loggedMinutes,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }
}
