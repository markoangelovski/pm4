import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Max, Min, Validate } from "class-validator";
import { MultipleOf15 } from "../../common/validation/minutes.js";

/** `PUT /workdays/{date}` body (API-WD-002). */
export class SetWorkdayDto {
  /** Minutes after midnight: 0–1425, a multiple of 15. */
  @ApiProperty({ type: Number, minimum: 0, maximum: 1425 })
  @IsInt()
  @Min(0)
  @Max(1425)
  @Validate(MultipleOf15)
  startMinute: number;
}
