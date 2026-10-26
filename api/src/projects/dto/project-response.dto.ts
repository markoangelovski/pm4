import { ApiProperty } from "@nestjs/swagger";
import { ProjectLeadDto } from "../../users/dto/project-lead.dto.js";
import { ProjectServiceDto } from "./project-service.dto.js";

/** Counts over the project's tasks that aren't individually deleted. */
export class TaskCountsDto {
  @ApiProperty({ type: "integer" })
  upcoming: number;
  @ApiProperty({ type: "integer" })
  inProgress: number;
  @ApiProperty({ type: "integer" })
  completed: number;
  /** `upcoming + inProgress + completed`. */
  @ApiProperty({ type: "integer" })
  total: number;
}

/** `Project` (endpoints.md *Shared project and task shapes*). */
export class ProjectResponseDto {
  id: string;
  title: string;
  @ApiProperty({ type: String, nullable: true })
  description: string | null;
  @ApiProperty({ type: String, nullable: true })
  externalLink: string | null;
  @ApiProperty({ type: ProjectLeadDto, nullable: true })
  projectLead: ProjectLeadDto | null;
  /** By name A–Z ignoring case, then id. */
  @ApiProperty({ type: [ProjectServiceDto] })
  services: ProjectServiceDto[];
  taskCounts: TaskCountsDto;
  /** Minutes of all the project's logs, computed (OQ-132). */
  @ApiProperty({ type: "integer" })
  loggedMinutes: number;
  /** ISO 8601 UTC */
  createdAt: string;
  /** ISO 8601 UTC */
  updatedAt: string;
}

/** A page of projects (API-PRJ-002). */
export class ProjectListResponseDto {
  items: ProjectResponseDto[];
  @ApiProperty({ type: "integer" })
  page: number;
  @ApiProperty({ type: "integer" })
  pageSize: number;
  @ApiProperty({ type: "integer" })
  total: number;
}
