import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { isUUID } from "class-validator";
import { sql } from "drizzle-orm";
import { todos } from "../database/schema/index.js";
import { toRef } from "../time/time-logs.service.js";
import { UsersRepository } from "../users/users.repository.js";
import { ItemLinkService } from "./item-link.service.js";
import { ListTodosQueryDto } from "./dto/list-todos-query.dto.js";
import { TodoInputDto } from "./dto/todo-input.dto.js";
import {
  TodoListResponseDto,
  TodoResponseDto
} from "./dto/todo-response.dto.js";
import { type TodoRow, TodosRepository } from "./todos.repository.js";

function toTodoDto(row: TodoRow): TodoResponseDto {
  return {
    id: row.id,
    text: row.text,
    doneAt: row.doneAt ? row.doneAt.toISOString() : null,
    project: toRef(row.projectId, row.projectTitle, row.deletedProjectTitle),
    task: toRef(row.taskId, row.taskTitle, row.deletedTaskTitle),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

/** To-dos (API-TODO-001…004), scoped to the caller. */
@Injectable()
export class TodosService {
  constructor(
    private readonly todosRepository: TodosRepository,
    private readonly usersRepository: UsersRepository,
    private readonly itemLinkService: ItemLinkService
  ) {}

  /** Every matching to-do of the caller, open and done (API-TODO-001). */
  async list(
    userId: string,
    query: ListTodosQueryDto
  ): Promise<TodoListResponseDto> {
    const { projectId, taskId, from, to } = query;
    const unlinked = query.unlinked === true;
    if (
      [projectId !== undefined, taskId !== undefined, unlinked].filter(Boolean)
        .length > 1
    ) {
      throw new BadRequestException({
        errors: [
          {
            field: "projectId",
            message: "use at most one of projectId, taskId and unlinked"
          }
        ]
      });
    }
    if (from !== undefined && to !== undefined && from > to) {
      throw new BadRequestException({
        errors: [{ field: "from", message: "must not be after to" }]
      });
    }
    let timeZone: string | undefined;
    if (from !== undefined || to !== undefined) {
      timeZone = (await this.usersRepository.findById(userId))?.timeZone;
    }
    const rows = await this.todosRepository.list(
      userId,
      { projectId, taskId, unlinked, q: query.q, from, to, timeZone },
      query.sort
    );
    return { items: rows.map(toTodoDto) };
  }

  /** Create a to-do (API-TODO-002). */
  async create(userId: string, dto: TodoInputDto): Promise<TodoResponseDto> {
    if (dto.text === undefined) {
      throw new BadRequestException({
        errors: [{ field: "text", message: "is required" }]
      });
    }
    const link = await this.itemLinkService.resolve(
      userId,
      dto.taskId,
      dto.projectId,
      null
    );
    const id = await this.todosRepository.insert(userId, {
      text: dto.text,
      doneAt: dto.done === true ? sql`now()` : null,
      ...link
    });
    return this.get(userId, id);
  }

  /** Change the given fields; `done` ticks it off or reopens it (API-TODO-003). */
  async update(
    userId: string,
    id: string,
    dto: TodoInputDto
  ): Promise<TodoResponseDto> {
    const row = await this.findOwned(userId, id);
    const linkChanged = dto.taskId !== undefined || dto.projectId !== undefined;
    const textChanged = dto.text !== undefined && dto.text !== row.text;

    const values: Parameters<TodosRepository["update"]>[2] = {};
    if (dto.text !== undefined) values.text = dto.text;
    if (dto.done === true) {
      values.doneAt = sql`coalesce(${todos.doneAt}, now())`;
    } else if (dto.done === false) {
      values.doneAt = null;
    }
    if (linkChanged) {
      const link = await this.itemLinkService.resolve(
        userId,
        dto.taskId,
        dto.projectId,
        row
      );
      Object.assign(values, {
        ...link,
        deletedProjectTitle: null,
        deletedTaskTitle: null
      });
    }
    if (textChanged || linkChanged) {
      values.updatedAt = sql`now()`;
    }
    await this.todosRepository.update(userId, id, values);
    return this.get(userId, id);
  }

  /** Delete a to-do permanently (API-TODO-004). */
  async remove(userId: string, id: string): Promise<void> {
    const deleted = isUUID(id)
      ? await this.todosRepository.delete(userId, id)
      : false;
    if (!deleted) throw new NotFoundException("To-do not found.");
  }

  private async get(userId: string, id: string): Promise<TodoResponseDto> {
    return toTodoDto(await this.findOwned(userId, id));
  }

  private async findOwned(userId: string, id: string): Promise<TodoRow> {
    const row = isUUID(id)
      ? await this.todosRepository.findById(userId, id)
      : null;
    if (!row) throw new NotFoundException("To-do not found.");
    return row;
  }
}
