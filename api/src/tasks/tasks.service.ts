import { Injectable, NotFoundException } from "@nestjs/common";
import { isUUID } from "class-validator";
import { ProjectLeadService } from "../users/project-lead.service.js";
import { ProjectsService } from "../projects/projects.service.js";
import { CreateTaskDto } from "./dto/create-task.dto.js";
import { ListTasksQueryDto } from "./dto/list-tasks-query.dto.js";
import {
  TaskListResponseDto,
  TaskResponseDto
} from "./dto/task-response.dto.js";
import { UpdateTaskDto } from "./dto/update-task.dto.js";
import {
  type TaskRow,
  type TaskValues,
  TasksRepository
} from "./tasks.repository.js";

/** Tasks (API-TSK-001…005), always the caller's own. */
@Injectable()
export class TasksService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly projectLeadService: ProjectLeadService,
    private readonly projectsService: ProjectsService
  ) {}

  async create(userId: string, dto: CreateTaskDto): Promise<TaskResponseDto> {
    // A missing or foreign project → 404 (D5).
    await this.projectsService.findOwned(userId, dto.projectId);
    if (dto.serviceId != null) {
      await this.projectsService.assertService(
        userId,
        dto.projectId,
        dto.serviceId
      );
    }

    const lead = (await this.projectLeadService.toColumns(dto, false))!;
    const id = await this.tasksRepository.insert(userId, {
      projectId: dto.projectId,
      title: dto.title,
      description: dto.description ?? null,
      externalLink: dto.externalLink ?? null,
      status: dto.status ?? "upcoming",
      dueDate: dto.dueDate ?? null,
      serviceId: dto.serviceId ?? null,
      ...lead
    });
    return this.get(userId, id);
  }

  async list(
    userId: string,
    query: ListTasksQueryDto
  ): Promise<TaskListResponseDto> {
    const { page, pageSize, sort, projectId, status } = query;
    const { rows, total } = await this.tasksRepository.list(
      userId,
      { projectId, status, q: query.q || null },
      sort,
      page,
      pageSize
    );
    return { items: rows.map((row) => this.toDto(row)), page, pageSize, total };
  }

  async get(userId: string, id: string): Promise<TaskResponseDto> {
    return this.toDto(await this.findOwned(userId, id));
  }

  /** Changes only the given fields; always sets `updatedAt` to now. */
  async update(
    userId: string,
    id: string,
    dto: UpdateTaskDto
  ): Promise<TaskResponseDto> {
    const task = await this.findOwned(userId, id);

    // Moving: the target project is checked like on create (D5).
    const moved =
      dto.projectId !== undefined && dto.projectId !== task.projectId;
    const target = moved ? dto.projectId! : task.projectId;
    if (moved) {
      await this.projectsService.findOwned(userId, dto.projectId!);
    }

    const lead = await this.projectLeadService.toColumns(dto, true);
    const values: Partial<TaskValues> = {};
    if (lead !== undefined) Object.assign(values, lead);
    if (dto.projectId !== undefined) values.projectId = dto.projectId;
    if (dto.title !== undefined) values.title = dto.title;
    if (dto.description !== undefined) values.description = dto.description;
    if (dto.externalLink !== undefined) values.externalLink = dto.externalLink;
    if (dto.status !== undefined) values.status = dto.status;
    if (dto.dueDate !== undefined) values.dueDate = dto.dueDate;
    // The service must belong to the target project (FR-TSK-009, OQ-247):
    // a move clears it unless the body names one of the new project's.
    if (typeof dto.serviceId === "string") {
      await this.projectsService.assertService(userId, target, dto.serviceId);
      values.serviceId = dto.serviceId;
    } else if (dto.serviceId === null || moved) {
      values.serviceId = null;
    }

    await this.tasksRepository.update(userId, id, values);
    return this.get(userId, id);
  }

  /** Deletes the task permanently (API-TSK-005). */
  async remove(userId: string, id: string): Promise<void> {
    if (!isUUID(id) || !(await this.tasksRepository.delete(userId, id))) {
      throw new NotFoundException("Task not found.");
    }
  }

  /** The caller's task by id. A non-UUID or missing id → `404 not-found`. */
  async findOwned(userId: string, id: string): Promise<TaskRow> {
    const task = isUUID(id)
      ? await this.tasksRepository.findById(userId, id)
      : null;
    if (!task) {
      throw new NotFoundException("Task not found.");
    }
    return task;
  }

  private toDto(row: TaskRow): TaskResponseDto {
    return {
      id: row.id,
      project: {
        id: row.projectId,
        title: row.projectTitle,
        deleted: false
      },
      service: row.serviceId
        ? { id: row.serviceId, name: row.serviceName! }
        : null,
      title: row.title,
      description: row.description,
      externalLink: row.externalLink,
      projectLead: this.projectLeadService.toDto(row),
      status: row.status,
      dueDate: row.dueDate,
      loggedMinutes: row.loggedMinutes,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }
}
