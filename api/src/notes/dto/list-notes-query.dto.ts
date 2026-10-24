import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength
} from "class-validator";
import { PageQueryDto } from "../../common/dto/page-query.dto.js";
import { Trim } from "../../common/validation/transforms.js";

export const NOTE_SORTS = [
  "updatedAt:desc",
  "updatedAt:asc",
  "createdAt:desc",
  "createdAt:asc"
] as const;

export type NoteSort = (typeof NOTE_SORTS)[number];

/** `GET /notes` query (API-NOTE-001), and `GET /todos` without paging: at most one of `projectId`, `taskId`, `unlinked=true`. */
export class ListNotesQueryDto extends PageQueryDto {
  /** Case-insensitive "contains" on a note's title or body, a to-do's text; empty = no filter. */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  declare q?: string;

  /** The project's items, its tasks' included; a foreign or unknown project → no items. */
  @IsOptional()
  @IsUUID()
  projectId?: string;

  /** One task's items. */
  @IsOptional()
  @IsUUID()
  taskId?: string;

  /** `true`: General only (no project, live or deleted). */
  @ApiProperty({ type: Boolean, required: false })
  @Transform(({ value }: { value: unknown }) =>
    value === "true" ? true : value === "false" ? false : value
  )
  @IsOptional()
  @IsBoolean()
  unlinked?: boolean;

  /** Sort order; ties break on `id` in the same direction. */
  @ApiProperty({
    enum: NOTE_SORTS,
    enumName: "NoteSort",
    required: false,
    default: "updatedAt:desc"
  })
  @IsOptional()
  @IsIn(NOTE_SORTS)
  sort: NoteSort = "updatedAt:desc";

  /** Inclusive; the sort's instant as a date in the user's time zone. */
  @ApiProperty({ type: String, format: "date", required: false })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  from?: string;

  /** Inclusive; the sort's instant as a date in the user's time zone. */
  @ApiProperty({ type: String, format: "date", required: false })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  to?: string;
}
