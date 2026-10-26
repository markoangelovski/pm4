import { ApiProperty } from "@nestjs/swagger";

/** `ProjectService`: a service the project offers (FR-PRJ-009). */
export class ProjectServiceDto {
  @ApiProperty({ type: String, format: "uuid" })
  id: string;

  name: string;

  /** The project's tasks linked to it, computed. */
  @ApiProperty({ type: "integer" })
  taskCount: number;
}

/** `ServiceRef`: a task's service (FR-TSK-009). */
export class ServiceRefDto {
  @ApiProperty({ type: String, format: "uuid" })
  id: string;

  name: string;
}

/** API-PRJ-006: every service name on the caller's projects, once ignoring case, A–Z. */
export class ServiceNamesResponseDto {
  items: string[];
}
