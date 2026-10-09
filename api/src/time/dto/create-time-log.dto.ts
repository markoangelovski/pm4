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

/** `POST /time-logs` body (API-TLOG-002). */
export class CreateTimeLogDto {
  /** The work date, `YYYY-MM-DD`; not after today. */
  @ApiProperty({ type: String, format: "date" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  workDate: string;

  /** 15–1440 minutes, a multiple of 15. */
  @ApiProperty({ type: Number, minimum: 15, maximum: 1440 })
  @IsInt()
  @Min(15)
  @Max(1440)
  @Validate(MultipleOf15)
  durationMinutes: number;

  /** 1–1000 chars after trimming. */
  @ApiProperty({ type: String, minLength: 1, maxLength: 1000 })
  @Trim()
  @IsString()
  @Length(1, 1000)
  text: string;

  /** ≤ 100 chars; empty after trimming → `null`. */
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

  /** Absent → `false`; not `null`. */
  @ApiProperty({ type: Boolean, required: false })
  @ValidateIf((o: CreateTimeLogDto) => o.excludeFromStats !== undefined)
  @IsBoolean()
  excludeFromStats?: boolean;

  /** The day's start when the date has no workday yet: 0–1425, a multiple of 15. */
  @ApiProperty({ type: Number, required: false, minimum: 0, maximum: 1425 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1425)
  @Validate(MultipleOf15)
  dayStartMinute?: number;
}
