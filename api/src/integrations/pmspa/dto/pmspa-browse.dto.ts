import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsISO8601,
  Matches
} from "class-validator";
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

/** `GET /integrations/pmspa/days` query (API-INT-007): one week at most, `from` ≤ `to`. */
export class PmspaDaysQueryDto {
  @ApiProperty({ type: String, format: "date" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "Must be a YYYY-MM-DD date." })
  @IsISO8601({ strict: true })
  from: string;

  @ApiProperty({ type: String, format: "date" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "Must be a YYYY-MM-DD date." })
  @IsISO8601({ strict: true })
  to: string;
}

/** `PmspaLog` (API-INT-007): a log in minutes, linked when a PM4 time log points at it. */
export class PmspaLogDto {
  id: string;
  title: string;
  durationMinutes: number;
  linked: boolean;
}

/** The task of a `PmspaEvent`, with its project's title. */
export class PmspaEventTaskDto {
  id: string;
  title: string;
  projectTitle: string;
}

/** `PmspaEvent` (API-INT-007). */
export class PmspaEventDto {
  id: string;
  title: string;
  @ApiProperty({ type: PmspaEventTaskDto, nullable: true })
  task: PmspaEventTaskDto | null;
  @ApiProperty({ type: [PmspaLogDto] })
  logs: PmspaLogDto[];
}

/** `PmspaDay` (API-INT-007). */
export class PmspaDayDto {
  /** `YYYY-MM-DD` */
  @ApiProperty({ type: String, format: "date" })
  date: string;
  @ApiProperty({ type: Number, nullable: true })
  startMinute: number | null;
  totalMinutes: number;
  @ApiProperty({ enum: ["linked", "partly-linked", "not-linked"] })
  linkState: "linked" | "partly-linked" | "not-linked";
  @ApiProperty({ type: [PmspaEventDto] })
  events: PmspaEventDto[];
}

/** `{ items: PmspaDay[] }`. */
export class PmspaDayListDto {
  @ApiProperty({ type: [PmspaDayDto] })
  items: PmspaDayDto[];
}

/** `PmspaDaySummary` (API-INT-007, OQ-205): a day as PMSPA's range lookup answers it. */
export class PmspaDaySummaryDto {
  /** `YYYY-MM-DD` */
  @ApiProperty({ type: String, format: "date" })
  date: string;
  @ApiProperty({ type: Number, nullable: true })
  startMinute: number | null;
  /** The event ids PMSPA lists for the day. */
  eventCount: number;
}

/** `{ items: PmspaDaySummary[] }`. */
export class PmspaDaySummaryListDto {
  @ApiProperty({ type: [PmspaDaySummaryDto] })
  items: PmspaDaySummaryDto[];
}

/** `GET /integrations/pmspa/days/details` query (API-INT-018): 1 to 7 distinct dates, the parameter repeated. */
export class PmspaDayDetailsQueryDto {
  @ApiProperty({ type: [String] })
  @Transform(({ value }: { value: unknown }): unknown[] =>
    Array.isArray(value) ? (value as unknown[]) : [value]
  )
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    each: true,
    message: "Must be a YYYY-MM-DD date."
  })
  @IsISO8601({ strict: true }, { each: true })
  dates: string[];
}
