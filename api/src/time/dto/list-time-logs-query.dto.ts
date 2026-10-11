import { PickType } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";
import { PageQueryDto } from "../../common/dto/page-query.dto.js";

/** `GET /time-logs` query (API-TLOG-001): exactly one of `projectId`, `taskId`; `q` isn't accepted. */
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
}
