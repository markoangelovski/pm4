import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { PageQueryDto } from "../../common/dto/page-query.dto.js";
import { Trim } from "../../common/validation/transforms.js";

export const PROJECT_SORTS = [
  "updatedAt:desc",
  "updatedAt:asc",
  "createdAt:desc",
  "createdAt:asc",
  "title:asc",
  "title:desc"
] as const;

export type ProjectSort = (typeof PROJECT_SORTS)[number];

/** `GET /projects` query (API-PRJ-002). */
export class ListProjectsQueryDto extends PageQueryDto {
  /** Case-insensitive "contains" on the title or the project lead's name (title matches first); empty = no filter. */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  declare q?: string;

  /** Sort order; `title` compares case-insensitively. Ties break on `id` descending. */
  @ApiProperty({
    enum: PROJECT_SORTS,
    required: false,
    default: "updatedAt:desc"
  })
  @IsOptional()
  @IsIn(PROJECT_SORTS)
  sort: ProjectSort = "updatedAt:desc";
}
