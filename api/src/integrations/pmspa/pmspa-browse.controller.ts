import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query
} from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { ApiProblemResponses } from "../../common/decorators/api-problem-responses/api-problem-responses.decorator.js";
import {
  type AuthUser,
  CurrentUser
} from "../../common/decorators/current-user/current-user.decorator.js";
import {
  PmspaDayDetailsQueryDto,
  PmspaDayListDto,
  PmspaDaySummaryListDto,
  PmspaDaysQueryDto,
  PmspaProjectDto,
  PmspaProjectListDto,
  PmspaProjectParamsDto,
  PmspaRecordLinkDto,
  PmspaTaskDto,
  PmspaTaskListDto
} from "./dto/pmspa-browse.dto.js";
import { PmspaConnectionRepository } from "./pmspa-connection.repository.js";
import {
  PmspaLinksRepository,
  type LinkRow,
  type PmspaLinkType
} from "./pmspa-links.repository.js";
import { PmspaRemote } from "./pmspa-remote.js";
import { PmspaSyncRepository } from "./pmspa-sync.repository.js";

/** `/api/v1/integrations/pmspa/projects` (API-INT-005, API-INT-006): the connected account's PMSPA records, read live. */
@ApiBearerAuth("bearer")
@Controller("integrations/pmspa")
export class PmspaBrowseController {
  constructor(
    private readonly remote: PmspaRemote,
    private readonly connections: PmspaConnectionRepository,
    private readonly links: PmspaLinksRepository,
    private readonly sync: PmspaSyncRepository
  ) {}

  /** The connected account's projects by title, with their PM4 links (API-INT-005). */
  @Get("projects")
  @ApiProblemResponses(401, 409, 502, 503)
  async projects(@CurrentUser() user: AuthUser): Promise<PmspaProjectListDto> {
    const remote = await this.remote.listProjects(user.id);
    const linked = await this.activeLinks(user.id, "project");
    const titles = await this.sync.titles(
      user.id,
      "project",
      [...linked.values()].map((row) => row.pm4Id)
    );
    const items = remote.map((p): PmspaProjectDto => ({
      id: p.id,
      title: p.title,
      done: p.done,
      taskCount: p.taskCount,
      link: toLink(linked.get(p.id), titles)
    }));
    return { items };
  }

  /** The tasks of one of the connected account's projects, with their PM4 links (API-INT-006). */
  @Get("projects/:id/tasks")
  @ApiProblemResponses(400, 401, 404, 409, 502, 503)
  async tasks(
    @CurrentUser() user: AuthUser,
    @Param() params: PmspaProjectParamsDto
  ): Promise<PmspaTaskListDto> {
    const projects = await this.remote.listProjects(user.id);
    if (!projects.some((p) => p.id === params.id)) {
      throw new NotFoundException("PMSPA project not found.");
    }
    const remote = await this.remote.listTasks(user.id, params.id);
    const linked = await this.activeLinks(user.id, "task");
    const titles = await this.sync.titles(
      user.id,
      "task",
      [...linked.values()].map((row) => row.pm4Id)
    );
    const items = remote.map((t): PmspaTaskDto => ({
      id: t.id,
      projectId: t.projectId,
      title: t.title,
      column: t.column,
      link: toLink(linked.get(t.id), titles)
    }));
    return { items };
  }

  /** Every task of the connected account, with their PM4 links (API-INT-017). */
  @Get("tasks")
  @ApiProblemResponses(401, 409, 502, 503)
  allTasks(@CurrentUser() user: AuthUser): Promise<PmspaTaskListDto> {
    void user;
    throw new Error("not implemented (feat-int-budget)");
  }

  /** The connected account's days in a week, newest first, from one PMSPA call: no events (API-INT-007). */
  @Get("days")
  @ApiProblemResponses(400, 401, 409, 502, 503)
  days(
    @CurrentUser() user: AuthUser,
    @Query() query: PmspaDaysQueryDto
  ): Promise<PmspaDaySummaryListDto> {
    assertWeek(query.from, query.to);
    void user;
    throw new Error("not implemented (feat-int-budget)");
  }

  /** The given days, newest first, with their events and logs (API-INT-018). */
  @Get("days/details")
  @ApiProblemResponses(400, 401, 409, 502, 503)
  dayDetails(
    @CurrentUser() user: AuthUser,
    @Query() query: PmspaDayDetailsQueryDto
  ): Promise<PmspaDayListDto> {
    void user;
    void query;
    throw new Error("not implemented (feat-int-budget)");
  }

  /** The active links of `type` keyed by their PMSPA id; none without a connected account. */
  private async activeLinks(
    userId: string,
    type: PmspaLinkType
  ): Promise<Map<string, LinkRow>> {
    const pmspaUserId = (await this.connections.find(userId))?.pmspaUserId;
    if (!pmspaUserId) return new Map();
    const rows = await this.links.active(userId, pmspaUserId, type);
    return new Map(rows.map((row) => [row.pmspaId, row]));
  }
}

/** A PM4 link as the browse lists show it, or null. */
function toLink(
  row: LinkRow | undefined,
  titles: Map<string, string>
): PmspaRecordLinkDto | null {
  if (!row) return null;
  return {
    pm4Id: row.pm4Id,
    pm4Title: titles.get(row.pm4Id) ?? "",
    origin: row.origin,
    syncedAt: row.syncedAt.toISOString()
  };
}

const DAY_MS = 86_400_000;

/** API-INT-007: `from` ≤ `to`, at most 7 days in all (one week of the Time tab). */
function assertWeek(from: string, to: string): void {
  const span = (Date.parse(to) - Date.parse(from)) / DAY_MS;
  if (span < 0 || span > 6) {
    throw new BadRequestException({
      errors: [
        {
          field: "to",
          message: "must not be before from and at most 7 days from it"
        }
      ]
    });
  }
}
