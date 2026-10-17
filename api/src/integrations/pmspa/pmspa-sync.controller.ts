import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { ApiProblemResponses } from "../../common/decorators/api-problem-responses/api-problem-responses.decorator.js";
import {
  type AuthUser,
  CurrentUser
} from "../../common/decorators/current-user/current-user.decorator.js";
import {
  PmspaImportDto,
  PmspaImportSelectionDto,
  PmspaSyncDto,
  PmspaSyncTargetDto,
  SyncPreviewDto,
  SyncResultDto
} from "./dto/sync.dto.js";
import { PmspaSyncService } from "./pmspa-sync.service.js";

/** `/api/v1/integrations/pmspa` import and sync: previews and commits (API-INT-008/009, API-INT-015/016). */
@ApiBearerAuth("bearer")
@Controller("integrations/pmspa")
export class PmspaSyncController {
  constructor(private readonly service: PmspaSyncService) {}

  /** The rows of an import of the selected PMSPA projects and tasks (API-INT-008). */
  @Post("import/preview")
  @HttpCode(HttpStatus.OK)
  @ApiProblemResponses(400, 401, 409, 502, 503)
  importPreview(
    @CurrentUser() user: AuthUser,
    @Body() dto: PmspaImportSelectionDto
  ): Promise<SyncPreviewDto> {
    return this.service.importPreview(user.id, dto);
  }

  /** The rows of a two-way sync of a PM4 project or task (API-INT-015). */
  @Post("sync/preview")
  @HttpCode(HttpStatus.OK)
  @ApiProblemResponses(400, 401, 404, 409, 502, 503)
  syncPreview(
    @CurrentUser() user: AuthUser,
    @Body() dto: PmspaSyncTargetDto
  ): Promise<SyncPreviewDto> {
    return this.service.syncPreview(user.id, dto);
  }

  /** Imports the selected PMSPA projects and tasks (API-INT-009). */
  @Post("import")
  @HttpCode(HttpStatus.OK)
  @ApiProblemResponses(400, 401, 409, 502, 503)
  importRun(
    @CurrentUser() user: AuthUser,
    @Body() dto: PmspaImportDto
  ): Promise<SyncResultDto> {
    return this.service.importRun(user.id, dto);
  }

  /** Syncs a PM4 project or task both ways (API-INT-016). */
  @Post("sync")
  @HttpCode(HttpStatus.OK)
  @ApiProblemResponses(400, 401, 404, 409, 502, 503)
  syncRun(
    @CurrentUser() user: AuthUser,
    @Body() dto: PmspaSyncDto
  ): Promise<SyncResultDto> {
    return this.service.syncRun(user.id, dto);
  }
}
