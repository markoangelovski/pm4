/* eslint-disable @typescript-eslint/no-unused-vars -- stubs (feat-note-todos) */
import { Injectable } from "@nestjs/common";
import { ListTodosQueryDto } from "./dto/list-todos-query.dto.js";
import { TodoInputDto } from "./dto/todo-input.dto.js";
import {
  TodoListResponseDto,
  TodoResponseDto
} from "./dto/todo-response.dto.js";

/** To-dos (API-TODO-001…004), scoped to the caller. */
@Injectable()
export class TodosService {
  /** Every matching to-do of the caller, open and done (API-TODO-001). */
  list(userId: string, query: ListTodosQueryDto): Promise<TodoListResponseDto> {
    throw new Error("not implemented (feat-note-todos)");
  }

  /** Create a to-do (API-TODO-002). */
  create(userId: string, dto: TodoInputDto): Promise<TodoResponseDto> {
    throw new Error("not implemented (feat-note-todos)");
  }

  /** Change the given fields; `done` ticks it off or reopens it (API-TODO-003). */
  update(
    userId: string,
    id: string,
    dto: TodoInputDto
  ): Promise<TodoResponseDto> {
    throw new Error("not implemented (feat-note-todos)");
  }

  /** Delete a to-do permanently (API-TODO-004). */
  remove(userId: string, id: string): Promise<void> {
    throw new Error("not implemented (feat-note-todos)");
  }
}
