import { ApiProperty } from "@nestjs/swagger";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsUUID,
  ValidateIf
} from "class-validator";
import { Transform } from "class-transformer";
import { PageQueryDto } from "../../common/dto/page-query.dto.js";
import type { TaskStatus } from "../../database/schema/index.js";
import { TASK_STATUSES } from "./create-task.dto.js";

export const TASK_SORTS = [
  "updatedAt:desc",
  "updatedAt:asc",
  "dueDate:asc",
  "dueDate:desc",
  "title:asc",
  "title:desc"
] as const;

export type TaskSort = (typeof TASK_SORTS)[number];

/** `GET /tasks` query (API-TSK-002). */
export class ListTasksQueryDto extends PageQueryDto {
  /** Filter to a single project; no value or foreign/trashed project → empty items. */
  @IsOptional()
  @IsUUID()
  projectId?: string;

  /** Filter to these statuses; absent = no filter; `status=` or an unknown value → 400. */
  @ApiProperty({
    enum: TASK_STATUSES,
    enumName: "TaskStatus",
    isArray: true,
    required: false
  })
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== "string") return value;
    if (value === "") return [];
    return value
      .split(",")
      .map((s) => s.trim())
      .filter((s, i, arr) => arr.indexOf(s) === i);
  })
  @ValidateIf(
    (o: unknown) => (o as Record<string, unknown>).status !== undefined
  )
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(TASK_STATUSES, { each: true })
  status?: TaskStatus[];

  /** Sort order; `title` compares case-insensitively. Ties break on `id` descending. */
  @ApiProperty({
    enum: TASK_SORTS,
    required: false,
    default: "updatedAt:desc"
  })
  @IsOptional()
  @IsIn(TASK_SORTS)
  sort: TaskSort = "updatedAt:desc";
}
