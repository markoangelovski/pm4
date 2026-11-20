import { ApiProperty, PickType } from "@nestjs/swagger";
import { IsISO8601, IsOptional, IsUUID, Matches } from "class-validator";
import { PageQueryDto } from "../../common/dto/page-query.dto.js";

/** `GET /time-logs` query (API-TLOG-001): exactly one of `projectId`, `taskId`, and the range `from`..`to`; `q` isn't accepted. */
export class ListTimeLogsQueryDto extends PickType(PageQueryDto, [
  "page",
  "pageSize"
] as const) {
  /** The project whose logs (its tasks' too) to list. */
  @IsOptional()
  @IsUUID()
  projectId?: string;

  /** The task whose logs to list. */
  @IsOptional()
  @IsUUID()
  taskId?: string;

  /** First work date of the range (`YYYY-MM-DD`). */
  @ApiProperty({ type: String, format: "date" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  from: string;

  /** Last work date of the range, inclusive: from ≤ to ≤ from + 366 days. */
  @ApiProperty({ type: String, format: "date" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  to: string;
}
