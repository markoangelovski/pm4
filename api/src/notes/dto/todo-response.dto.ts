import { ApiProperty } from "@nestjs/swagger";
import { RefDto } from "../../common/dto/ref.dto.js";

/** `Todo` (endpoints.md *Shared note and to-do shapes*). */
export class TodoResponseDto {
  id: string;

  text: string;

  /** ISO 8601 UTC; `null` = open. */
  @ApiProperty({ type: String, nullable: true })
  doneAt: string | null;

  @ApiProperty({ type: RefDto, nullable: true })
  project: RefDto | null;

  @ApiProperty({ type: RefDto, nullable: true })
  task: RefDto | null;

  /** ISO 8601 UTC */
  createdAt: string;

  /** ISO 8601 UTC; changes with the text or the link, not with `doneAt`. */
  updatedAt: string;
}

/** Every to-do that matches (API-TODO-001), no paging. */
export class TodoListResponseDto {
  items: TodoResponseDto[];
}
