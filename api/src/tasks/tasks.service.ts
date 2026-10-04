import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { isUUID } from "class-validator";
import { InTrashException } from "../common/exceptions/in-trash.exception.js";
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

/** Tasks (API-TSK-001…006), always the caller's own. */
@Injectable()
export class TasksService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly projectLeadService: ProjectLeadService,
    private readonly projectsService: ProjectsService
  ) {}

  async create(userId: string, dto: CreateTaskDto): Promise<TaskResponseDto> {
    // A missing, foreign or trashed project is a plain 404 (D5).
    try {
      await this.projectsService.findOwned(userId, dto.projectId);
    } catch (error) {
      if (
        error instanceof InTrashException ||
        error instanceof NotFoundException
      ) {
        throw new NotFoundException("Project not found.");
      }
      throw error;
    }

    const lead = (await this.projectLeadService.toColumns(dto, false))!;
    const id = await this.tasksRepository.insert(userId, {
      projectId: dto.projectId,
      title: dto.title,
      description: dto.description ?? null,
      externalLink: dto.externalLink ?? null,
      status: dto.status ?? "upcoming",
      dueDate: dto.dueDate ?? null,
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
    if (dto.projectId !== undefined && dto.projectId !== task.projectId) {
      try {
        await this.projectsService.findOwned(userId, dto.projectId);
      } catch (error) {
        if (
          error instanceof InTrashException ||
          error instanceof NotFoundException
        ) {
          throw new NotFoundException("Project not found.");
        }
        throw error;
      }
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

    await this.tasksRepository.update(userId, id, values);
    return this.get(userId, id);
  }

  /** Moves the task to the trash. */
  async remove(userId: string, id: string): Promise<void> {
    await this.findOwned(userId, id);
    await this.tasksRepository.setDeletedAt(userId, id, new Date());
  }

  /**
   * Takes the task out of the trash; if the task's project is in the trash,
   * raises 409. An active task → no change.
   */
  async restore(userId: string, id: string): Promise<void> {
    const task = await this.findOwned(userId, id, { allowTrashed: true });

    // Check if the task's project is in the trash
    if (task.projectDeletedAt !== null) {
      throw new ConflictException({
        message:
          "The task's project is in the trash. Restore the project instead.",
        problemType: "conflict"
      });
    }

    if (task.deletedAt !== null) {
      await this.tasksRepository.setDeletedAt(userId, id, null);
    }
  }

  /**
   * The caller's task by id. A non-UUID or
   * missing id → `404 not-found`; a trashed one → `404 in-trash`
   * unless `allowTrashed`; a task whose project is in the trash
   * → `404 in-trash` with `projectInTrash: true`.
   */
  async findOwned(
    userId: string,
    id: string,
    opts: { allowTrashed?: boolean } = {}
  ): Promise<TaskRow> {
    const task = isUUID(id)
      ? await this.tasksRepository.findById(userId, id)
      : null;

    if (!task) {
      throw new NotFoundException("Task not found.");
    }

    if (
      !opts.allowTrashed &&
      (task.deletedAt !== null || task.projectDeletedAt !== null)
    ) {
      throw new InTrashException("Task is in the trash.", {
        projectId: task.projectId,
        projectInTrash: task.projectDeletedAt !== null
      });
    }

    return task;
  }

  private toDto(row: TaskRow): TaskResponseDto {
    return {
      id: row.id,
      project: {
        id: row.projectId,
        title: row.projectTitle,
        deleted: row.projectDeletedAt !== null
      },
      title: row.title,
      description: row.description,
      externalLink: row.externalLink,
      projectLead: this.projectLeadService.toDto(row),
      status: row.status,
      dueDate: row.dueDate,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }
}
