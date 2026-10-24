import { ApiProperty } from "@nestjs/swagger";
import { RefDto } from "../../common/dto/ref.dto.js";

/** `Note` (endpoints.md *Shared note and to-do shapes*). */
export class NoteResponseDto {
  id: string;

  @ApiProperty({ type: String, nullable: true })
  title: string | null;

  /** Markdown, as written. */
  body: string;

  @ApiProperty({ type: RefDto, nullable: true })
  project: RefDto | null;

  @ApiProperty({ type: RefDto, nullable: true })
  task: RefDto | null;

  /** ISO 8601 UTC */
  createdAt: string;

  /** ISO 8601 UTC */
  updatedAt: string;
}

/** A page of notes (API-NOTE-001). */
export class NoteListResponseDto {
  items: NoteResponseDto[];
  @ApiProperty({ type: "integer" })
  page: number;
  @ApiProperty({ type: "integer" })
  pageSize: number;
  @ApiProperty({ type: "integer" })
  total: number;
}
