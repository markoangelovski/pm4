import { ApiProperty, OmitType } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";
import { ListNotesQueryDto } from "./list-notes-query.dto.js";

export const TODO_SORTS = [
  "updatedAt:desc",
  "updatedAt:asc",
  "createdAt:desc",
  "createdAt:asc"
] as const;

export type TodoSort = (typeof TODO_SORTS)[number];

/** `GET /todos` query (API-TODO-001): the notes filter, search and range, without paging; its own sort (no `title:asc`). */
export class ListTodosQueryDto extends OmitType(ListNotesQueryDto, [
  "page",
  "pageSize",
  "sort"
] as const) {
  /** Sort order; ties break on `id` in the same direction. */
  @ApiProperty({
    enum: TODO_SORTS,
    enumName: "TodoSort",
    required: false,
    default: "updatedAt:desc"
  })
  @IsOptional()
  @IsIn(TODO_SORTS)
  sort: TodoSort = "updatedAt:desc";
}
