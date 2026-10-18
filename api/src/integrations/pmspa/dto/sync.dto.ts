import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDefined,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested
} from "class-validator";
import { PmspaDayDto } from "./pmspa-browse.dto.js";

// The sync shapes of the PMSPA connector (feat-int-sync-api; endpoints.md *Shared PMSPA shapes*), copied from
// web/proto/features/integrations/proposed-types.ts. Request bodies validate; response shapes document only.
// Structurally compatible with the interfaces of pmspa-preview.ts (the preview rows).

export const SYNC_CHOICE_KINDS = ["create", "link", "skip"] as const;
export const SYNC_DIRECTIONS = ["to-pm4", "to-pmspa"] as const;

/** One shared field whose values differ between a PM4 record and its PMSPA counterpart (OQ-173). */
export class SyncFieldDiffDto {
  /** E.g. "Title", "Lead", "Due date". */
  field: string;
  /** Null when the side has no value. */
  @ApiProperty({ type: String, nullable: true })
  pm4: string | null;
  @ApiProperty({ type: String, nullable: true })
  pmspa: string | null;
}

/** A record the user can link to instead of creating one (Link to existing, OQ-157). */
export class SyncCandidateDto {
  id: string;
  title: string;
  /** For a task: its project on the same side. */
  @ApiProperty({ type: String, nullable: true })
  groupId: string | null;
  /** What tells it apart from the row's record, e.g. "Lead Jane Doe". */
  @ApiProperty({ type: String, nullable: true })
  detail: string | null;
  @ApiProperty({ type: [SyncFieldDiffDto] })
  differences: SyncFieldDiffDto[];
}

/** The PMSPA project and task an event row sits under (OQ-205). */
export class SyncTaskPathDto {
  projectTitle: string;
  taskTitle: string;
}

/** One row of an import or sync preview (design principle 6). */
export class SyncPreviewItemDto {
  /** Stable within the preview, e.g. `project:66f1…`. */
  key: string;
  @ApiProperty({ type: String, nullable: true })
  parentKey: string | null;
  @ApiProperty({ enum: ["project", "task", "day", "event"] })
  type: "project" | "task" | "day" | "event";
  title: string;
  @ApiProperty({ type: String, nullable: true })
  detail: string | null;
  @ApiProperty({ enum: ["create", "update", "skip", "differs"] })
  action: "create" | "update" | "skip" | "differs";
  /** Where a project or task is written (OQ-172). Null for days, events and undecided differs rows. */
  @ApiProperty({ enum: SYNC_DIRECTIONS, nullable: true })
  direction: "to-pm4" | "to-pmspa" | null;
  @ApiProperty({ type: String, nullable: true })
  reason: string | null;
  /** The linked counterpart's id on the other side, or null. */
  @ApiProperty({ type: String, nullable: true })
  linkedId: string | null;
  parent: boolean;
  optional: boolean;
  @ApiProperty({
    type: [SyncCandidateDto],
    nullable: true,
    description:
      "Null: a sync or push row whose PMSPA candidates weren't read (OQ-204, API-INT-019)."
  })
  candidates: SyncCandidateDto[] | null;
  @ApiProperty({ type: [SyncFieldDiffDto] })
  differences: SyncFieldDiffDto[];
  @ApiProperty({ type: [String] })
  warnings: string[];
  @ApiPropertyOptional({
    type: SyncTaskPathDto,
    description:
      "An import's or a day push's event row with a PMSPA task (OQ-205)."
  })
  taskPath?: SyncTaskPathDto;
}

/** `SyncPreview` (API-INT-008, API-INT-015). */
export class SyncPreviewDto {
  @ApiProperty({ type: [SyncPreviewItemDto] })
  items: SyncPreviewItemDto[];
  @ApiPropertyOptional({
    type: [PmspaDayDto],
    description:
      "API-INT-008/009 with `dates`: the selected days read (OQ-205)."
  })
  days?: PmspaDayDto[];
}

/** One record's outcome of an import or sync (design principle 9). */
export class SyncResultItemDto {
  key: string;
  @ApiProperty({ type: String, nullable: true })
  parentKey: string | null;
  @ApiProperty({ enum: ["project", "task", "day", "event"] })
  type: "project" | "task" | "day" | "event";
  title: string;
  /** The title after an overwrite changed it (shown as "old → new", OQ-174). */
  @ApiProperty({ type: String, nullable: true })
  newTitle: string | null;
  @ApiProperty({ enum: ["created", "updated", "linked", "skipped", "failed"] })
  outcome: "created" | "updated" | "linked" | "skipped" | "failed";
  @ApiProperty({ type: String, nullable: true })
  reason: string | null;
}

/** `SyncResult` (API-INT-009, API-INT-016). */
export class SyncResultDto {
  @ApiProperty({ type: [SyncResultItemDto] })
  items: SyncResultItemDto[];
  /** ISO 8601 UTC */
  syncedAt: string;
  @ApiPropertyOptional({
    type: [PmspaDayDto],
    description:
      "API-INT-008/009 with `dates`: the selected days read (OQ-205)."
  })
  days?: PmspaDayDto[];
}

/**
 * The user's choice for one preview row (OQ-172, OQ-173). `link` pairs the row's record with `id` and overwrites
 * the `overwrite` side, or nothing (Link only). `skip` leaves the row out. A row without a choice: `create`, or
 * for a row that differs, `link` with its suggested direction.
 */
export class SyncChoiceDto {
  /** The preview row's key. */
  @IsString()
  @MaxLength(100)
  key: string;

  @ApiProperty({ enum: SYNC_CHOICE_KINDS })
  @IsIn(SYNC_CHOICE_KINDS)
  kind: "create" | "link" | "skip";

  /** `link`: the record to pair with (a picked candidate, or the linked counterpart). */
  @ValidateIf((o: SyncChoiceDto) => o.kind === "link")
  @IsString()
  @MaxLength(36)
  id?: string;

  /** `link`: the side to overwrite; null = Link only. */
  @ApiProperty({ enum: SYNC_DIRECTIONS, nullable: true, required: false })
  @ValidateIf((o: SyncChoiceDto) => o.kind === "link")
  @IsOptional()
  @IsIn(SYNC_DIRECTIONS)
  overwrite?: "to-pm4" | "to-pmspa" | null;
}

/** A PMSPA project to import, with its tasks (`taskIds: null` = all of them). */
export class PmspaImportProjectDto {
  /** A 24-hex PMSPA ObjectId. */
  @Matches(/^[0-9a-f]{24}$/, { message: "Must be a 24-character hex id." })
  id: string;

  @ApiProperty({ type: [String], nullable: true })
  @ValidateIf((o: PmspaImportProjectDto) => o.taskIds !== null)
  @IsArray()
  @ArrayMaxSize(500)
  @Matches(/^[0-9a-f]{24}$/, {
    each: true,
    message: "Must be a 24-character hex id."
  })
  taskIds: string[] | null;
}

/** `PmspaImportSelection` (API-INT-008, API-INT-009): the projects and tasks, and the days to import (time). */
export class PmspaImportSelectionDto {
  @ApiProperty({ type: [PmspaImportProjectDto] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PmspaImportProjectDto)
  projects: PmspaImportProjectDto[];

  /** The days to import, `YYYY-MM-DD`, each once (feat-int-time-api). */
  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @ArrayUnique()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { each: true })
  @IsISO8601({ strict: true }, { each: true })
  dates?: string[];
}

/** `POST /integrations/pmspa/import` body (API-INT-009). */
export class PmspaImportDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => PmspaImportSelectionDto)
  selection: PmspaImportSelectionDto;

  @ApiProperty({ type: [SyncChoiceDto] })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => SyncChoiceDto)
  choices: SyncChoiceDto[];
}

/** A PM4 record to sync both ways (API-INT-015, API-INT-016). */
export class PmspaSyncTargetDto {
  @ApiProperty({ enum: ["project", "task"] })
  @IsIn(["project", "task"])
  type: "project" | "task";

  @IsUUID()
  id: string;
}

/** `POST /integrations/pmspa/sync` body (API-INT-016). */
export class PmspaSyncDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => PmspaSyncTargetDto)
  target: PmspaSyncTargetDto;

  @ApiProperty({ type: [SyncChoiceDto] })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => SyncChoiceDto)
  choices: SyncChoiceDto[];
}

/** The PM4 record a push preview or push reads: a PM4 day (API-INT-010, API-INT-011). */
export class PmspaPushTargetDto {
  @ApiProperty({ enum: ["day"] })
  @IsIn(["day"])
  type: "day";

  /** The PM4 day, `YYYY-MM-DD` in the user's calendar. */
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  id: string;
}

/** `POST /integrations/pmspa/push` body (API-INT-011). */
export class PmspaPushDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => PmspaPushTargetDto)
  target: PmspaPushTargetDto;

  @ApiProperty({ type: [SyncChoiceDto] })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => SyncChoiceDto)
  choices: SyncChoiceDto[];
}

/** `PmspaCandidatesInput` (API-INT-019, OQ-204). */
export class PmspaCandidatesInputDto {
  @ApiProperty({ enum: ["project", "task"] })
  @IsIn(["project", "task"])
  type: "project" | "task";

  /** A 24-hex PMSPA project id; required for `task`, ignored for `project`. */
  @ApiProperty({ type: String, required: false })
  @ValidateIf((o: PmspaCandidatesInputDto) => o.type === "task")
  @Matches(/^[0-9a-f]{24}$/, { message: "Must be a 24-character hex id." })
  projectId?: string;

  /** The PM4 projects or tasks of `type` to compare with. */
  @ApiProperty({ type: [String], format: "uuid" })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ArrayUnique()
  @IsUUID("all", { each: true })
  for: string[];
}

/** The Link to existing candidates of one PM4 record (API-INT-019). */
export class PmspaCandidatesItemDto {
  @ApiProperty({ format: "uuid" })
  pm4Id: string;
  @ApiProperty({ type: [SyncCandidateDto] })
  candidates: SyncCandidateDto[];
}

/** `PmspaCandidates` (API-INT-019). */
export class PmspaCandidatesDto {
  @ApiProperty({ type: [PmspaCandidatesItemDto] })
  items: PmspaCandidatesItemDto[];
}
