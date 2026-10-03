import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";
import { PageQueryDto } from "../../common/dto/page-query.dto.js";

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
