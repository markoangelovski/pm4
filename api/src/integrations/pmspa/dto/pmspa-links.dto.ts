import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsUUID } from "class-validator";
import type { PmspaColumn } from "../pmspa-fields.js";
import type {
  PmspaLinkOrigin,
  PmspaLinkType
} from "../pmspa-links.repository.js";

export const PMSPA_LINK_TYPES = ["project", "task", "time-log"] as const;

/** `PmspaLink` (API-INT-012). */
export class PmspaLinkDto {
  pm4Id: string;
  @ApiProperty({
    enum: ["imported", "pushed", "linked"],
    enumName: "PmspaLinkOrigin"
  })
  origin: PmspaLinkOrigin;
  /** ISO 8601 UTC */
  syncedAt: string;
}

/** `{ items: PmspaLink[] }`. */
export class PmspaLinkListDto {
  @ApiProperty({ type: [PmspaLinkDto] })
  items: PmspaLinkDto[];
}

/** `PmspaRecordDetail` (API-INT-014): the PMSPA counterpart, by `type`. */
export class PmspaRecordDetailDto {
  @ApiProperty({ enum: PMSPA_LINK_TYPES, enumName: "PmspaLinkType" })
  type: PmspaLinkType;
  title: string;
  /** Project: its lead's name, "" when none. */
  lead?: string;
  /** Project: whether it's done. */
  done?: boolean;
  /** Task: its project's title. */
  projectTitle?: string;
  /** Task: its column. */
  column?: PmspaColumn;
  /** Time log: its PMSPA event's title. */
  eventTitle?: string;
}

/** `PmspaLinkDetail` (API-INT-014). `pmspa: null` = gone in PMSPA. */
export class PmspaLinkDetailDto {
  @ApiProperty({
    enum: ["imported", "pushed", "linked"],
    enumName: "PmspaLinkOrigin"
  })
  origin: PmspaLinkOrigin;
  /** ISO 8601 UTC */
  syncedAt: string;
  @ApiProperty({ type: PmspaRecordDetailDto, nullable: true })
  pmspa: PmspaRecordDetailDto | null;
}

/** `GET /integrations/pmspa/links?type=` (API-INT-012). */
export class PmspaLinkTypeQueryDto {
  @ApiProperty({ enum: PMSPA_LINK_TYPES })
  @IsIn(PMSPA_LINK_TYPES)
  type: PmspaLinkType;
}

/** `/integrations/pmspa/links/{type}/{id}` path (API-INT-013, API-INT-014). */
export class PmspaLinkParamsDto {
  @ApiProperty({ enum: PMSPA_LINK_TYPES })
  @IsIn(PMSPA_LINK_TYPES)
  type: PmspaLinkType;

  /** The PM4 record's id. */
  @IsUUID()
  id: string;
}
