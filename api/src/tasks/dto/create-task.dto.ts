import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  ValidateIf
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Trim, TrimToNull } from "../../common/validation/transforms.js";
import { taskStatus } from "../../database/schema/index.js";
import type { TaskStatus } from "../../database/schema/index.js";

export const TASK_STATUSES = taskStatus.enumValues;

/** `POST /tasks` body (API-TSK-001). */
export class CreateTaskDto {
  /** The project that contains this task. */
  @IsUUID()
  projectId: string;

  /** 1–200 chars after trimming. */
  @Trim()
  @IsString()
  @Length(1, 200)
  title: string;

  /** ≤ 2000 chars; empty after trimming → `null`. */
  @ApiProperty({ type: String, nullable: true, required: false })
  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  /** Absolute `http(s)://` URL, ≤ 500 chars; empty after trimming → `null`. */
  @ApiProperty({ type: String, nullable: true, required: false })
  @IsOptional()
  @TrimToNull()
  @IsUrl({ protocols: ["http", "https"], require_protocol: true })
  @MaxLength(500)
  externalLink?: string | null;

  /** A registered user as the lead; excludes `projectLeadName`. */
  @ApiProperty({
    type: String,
    format: "uuid",
    nullable: true,
    required: false
  })
  @IsOptional()
  @IsUUID()
  projectLeadUserId?: string | null;

  /** A free-text lead name, ≤ 100 chars; empty after trimming → `null`. */
  @ApiProperty({ type: String, nullable: true, required: false })
  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(100)
  projectLeadName?: string | null;

  /** Status of the task; absent defaults to `upcoming`. `null` → 400. */
  @ApiProperty({ enum: TASK_STATUSES, enumName: "TaskStatus", required: false })
  @ValidateIf((o: CreateTaskDto) => o.status !== undefined)
  @IsIn(TASK_STATUSES)
  status?: TaskStatus;

  /** Work date in `YYYY-MM-DD`; empty after trimming → `null`. */
  @ApiProperty({ type: String, nullable: true, required: false })
  @IsOptional()
  @TrimToNull()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  dueDate?: string | null;
}
