import { ApiProperty } from "@nestjs/swagger";
import { IsISO8601, Matches } from "class-validator";

/** `GET /workdays` query (API-WD-001). */
export class WorkdaysQueryDto {
  @ApiProperty({ type: String, format: "date" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  from: string;

  @ApiProperty({ type: String, format: "date" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  to: string;
}
