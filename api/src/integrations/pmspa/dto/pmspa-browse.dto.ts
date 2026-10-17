import { ApiProperty } from "@nestjs/swagger";
import { Matches } from "class-validator";
import type { PmspaColumn } from "../pmspa-fields.js";
import type { PmspaLinkOrigin } from "../pmspa-links.repository.js";

export const PMSPA_COLUMNS = ["Upcoming", "In Progress", "Completed"] as const;

/** `PmspaRecordLink`: the PM4 record a PMSPA record is linked to. */
export class PmspaRecordLinkDto {
  pm4Id: string;
  pm4Title: string;
  @ApiProperty({
    enum: ["imported", "pushed", "linked"],
    enumName: "PmspaLinkOrigin"
  })
  origin: PmspaLinkOrigin;
  /** ISO 8601 UTC */
  syncedAt: string;
}

/** `PmspaProject` (API-INT-005). */
export class PmspaProjectDto {
  /** A 24-hex ObjectId. */
  id: string;
  title: string;
  done: boolean;
  /** PMSPA's open + closed task count. */
  taskCount: number;
  @ApiProperty({ type: PmspaRecordLinkDto, nullable: true })
  link: PmspaRecordLinkDto | null;
}

/** `{ items: PmspaProject[] }`. */
export class PmspaProjectListDto {
  @ApiProperty({ type: [PmspaProjectDto] })
  items: PmspaProjectDto[];
}

/** `PmspaTask` (API-INT-006). */
export class PmspaTaskDto {
  id: string;
  projectId: string;
  title: string;
  @ApiProperty({ enum: PMSPA_COLUMNS, enumName: "PmspaColumn" })
  column: PmspaColumn;
  @ApiProperty({ type: PmspaRecordLinkDto, nullable: true })
  link: PmspaRecordLinkDto | null;
}

/** `{ items: PmspaTask[] }`. */
export class PmspaTaskListDto {
  @ApiProperty({ type: [PmspaTaskDto] })
  items: PmspaTaskDto[];
}

/** `/integrations/pmspa/projects/{id}/tasks` path (API-INT-006). */
export class PmspaProjectParamsDto {
  /** A 24-hex PMSPA ObjectId. */
  @Matches(/^[0-9a-f]{24}$/, { message: "Must be a 24-character hex id." })
  id: string;
}
