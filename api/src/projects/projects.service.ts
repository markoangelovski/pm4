import { Injectable, NotFoundException } from "@nestjs/common";
import { isUUID } from "class-validator";
import { InTrashException } from "../common/exceptions/in-trash.exception.js";
import { ProjectLeadService } from "../users/project-lead.service.js";
import { CreateProjectDto } from "./dto/create-project.dto.js";
import { ListProjectsQueryDto } from "./dto/list-projects-query.dto.js";
import {
  ProjectListResponseDto,
  ProjectResponseDto
} from "./dto/project-response.dto.js";
import { UpdateProjectDto } from "./dto/update-project.dto.js";
import {
  type ProjectRow,
  type ProjectValues,
  ProjectsRepository
} from "./projects.repository.js";

/** Projects (API-PRJ-001…006), always the caller's own. */
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
    const id = await this.projectsRepository.insert(userId, {
      title: dto.title,
      description: dto.description ?? null,
      externalLink: dto.externalLink ?? null,
      ...lead
    });
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
    return { items: rows.map((row) => this.toDto(row)), page, pageSize, total };
  }

  async get(userId: string, id: string): Promise<ProjectResponseDto> {
    return this.toDto(await this.findOwned(userId, id));
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
    await this.projectsRepository.update(userId, id, values);
    return this.get(userId, id);
  }

  /** Moves the project to the trash; its tasks aren't changed. */
  async remove(userId: string, id: string): Promise<void> {
    await this.findOwned(userId, id);
    await this.projectsRepository.setDeletedAt(userId, id, new Date());
  }

  /** Takes the project out of the trash; an active project → no change. */
  async restore(userId: string, id: string): Promise<void> {
    const project = await this.findOwned(userId, id, { allowTrashed: true });
    if (project.deletedAt !== null) {
      await this.projectsRepository.setDeletedAt(userId, id, null);
    }
  }

  /**
   * The caller's project by id (shared with feat-tsk-api). A non-UUID or
   * missing id → `404 not-found` (D11); a trashed one → `404 in-trash`
   * unless `allowTrashed`.
   */
  async findOwned(
    userId: string,
    id: string,
    opts: { allowTrashed?: boolean } = {}
  ): Promise<ProjectRow> {
    const project = isUUID(id)
      ? await this.projectsRepository.findById(userId, id)
      : null;
    if (!project) {
      throw new NotFoundException("Project not found.");
    }
    if (project.deletedAt !== null && !opts.allowTrashed) {
      throw new InTrashException("Project is in the trash.");
    }
    return project;
  }

  private toDto(row: ProjectRow): ProjectResponseDto {
    const { upcoming, inProgress, completed } = row.counts;
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      externalLink: row.externalLink,
      projectLead: this.projectLeadService.toDto(row),
      taskCounts: {
        upcoming,
        inProgress,
        completed,
        total: upcoming + inProgress + completed
      },
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }
}
