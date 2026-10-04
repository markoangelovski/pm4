import { ApiProperty } from "@nestjs/swagger";
import { RefDto } from "../../common/dto/ref.dto.js";
import { ProjectLeadDto } from "../../users/dto/project-lead.dto.js";
import type { TaskStatus } from "../../database/schema/index.js";
import { TASK_STATUSES } from "./create-task.dto.js";

/** `Task` (endpoints.md *Shared project and task shapes*). */
export class TaskResponseDto {
  id: string;

  project: RefDto;

  title: string;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ type: String, nullable: true })
  externalLink: string | null;

  @ApiProperty({ type: ProjectLeadDto, nullable: true })
  projectLead: ProjectLeadDto | null;

  @ApiProperty({
    enum: TASK_STATUSES,
    enumName: "TaskStatus"
  })
  status: TaskStatus;

  /** Work date, `YYYY-MM-DD` */
  @ApiProperty({ type: String, nullable: true })
  dueDate: string | null;

  /** ISO 8601 UTC */
  createdAt: string;

  /** ISO 8601 UTC */
  updatedAt: string;
}

/** A page of tasks (API-TSK-002). */
export class TaskListResponseDto {
  items: TaskResponseDto[];

  @ApiProperty({ type: "integer" })
  page: number;

  @ApiProperty({ type: "integer" })
  pageSize: number;

  @ApiProperty({ type: "integer" })
  total: number;
}
