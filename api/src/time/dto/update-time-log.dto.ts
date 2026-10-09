import { ApiProperty } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidateIf
} from "class-validator";
import { MultipleOf15 } from "../../common/validation/minutes.js";
import { Trim, TrimToNull } from "../../common/validation/transforms.js";

/** `PATCH /time-logs/{id}` body (API-TLOG-004): the create fields, all optional. */
export class UpdateTimeLogDto {
  /** Moves the log to this date; not `null`, not after today. */
  @ApiProperty({ type: String, format: "date", required: false })
  @ValidateIf((o: UpdateTimeLogDto) => o.workDate !== undefined)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  workDate?: string;

  /** 15–1440 minutes, a multiple of 15; not `null`. */
  @ApiProperty({ type: Number, required: false, minimum: 15, maximum: 1440 })
  @ValidateIf((o: UpdateTimeLogDto) => o.durationMinutes !== undefined)
  @IsInt()
  @Min(15)
  @Max(1440)
  @Validate(MultipleOf15)
  durationMinutes?: number;

  /** 1–1000 chars after trimming; not `null`. */
  @ApiProperty({
    type: String,
    required: false,
    minLength: 1,
    maxLength: 1000
  })
  @ValidateIf((o: UpdateTimeLogDto) => o.text !== undefined)
  @Trim()
  @IsString()
  @Length(1, 1000)
  text?: string;

  /** ≤ 100 chars; empty after trimming or `null` clears it. */
  @ApiProperty({ type: String, nullable: true, required: false })
  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(100)
  title?: string | null;

  @ApiProperty({
    type: String,
    format: "uuid",
    nullable: true,
    required: false
  })
  @IsOptional()
  @IsUUID()
  projectId?: string | null;

  @ApiProperty({
    type: String,
    format: "uuid",
    nullable: true,
    required: false
  })
  @IsOptional()
  @IsUUID()
  taskId?: string | null;

  /** Not `null`. */
  @ApiProperty({ type: Boolean, required: false })
  @ValidateIf((o: UpdateTimeLogDto) => o.excludeFromStats !== undefined)
  @IsBoolean()
  excludeFromStats?: boolean;

  /** The start of the target date when it has no workday yet. */
  @ApiProperty({ type: Number, required: false, minimum: 0, maximum: 1425 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1425)
  @Validate(MultipleOf15)
  dayStartMinute?: number;
}
