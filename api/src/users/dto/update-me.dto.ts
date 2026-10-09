import {
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidateIf
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Trim } from "../../common/validation/transforms.js";
import { IanaTimeZone, MultipleOf15 } from "../../common/validation/minutes.js";

/**
 * `PATCH /me` body (API-USR-002): both fields optional; neither may be `null`.
 */
export class UpdateMeDto {
  /** An IANA time zone, ≤ 64 chars. */
  @ApiProperty({ type: String, required: false, maxLength: 64 })
  @ValidateIf((o: UpdateMeDto) => o.timeZone !== undefined)
  @Trim()
  @IsString()
  @MaxLength(64)
  @Validate(IanaTimeZone)
  timeZone?: string;

  /** The daily target in minutes: 15–1440, a multiple of 15. */
  @ApiProperty({
    type: Number,
    required: false,
    minimum: 15,
    maximum: 1440
  })
  @ValidateIf((o: UpdateMeDto) => o.dailyTargetMinutes !== undefined)
  @IsInt()
  @Min(15)
  @Max(1440)
  @Validate(MultipleOf15)
  dailyTargetMinutes?: number;
}
