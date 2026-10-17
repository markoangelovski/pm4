import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { ApiProblemResponses } from "../../common/decorators/api-problem-responses/api-problem-responses.decorator.js";
import {
  type AuthUser,
  CurrentUser
} from "../../common/decorators/current-user/current-user.decorator.js";
import {
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
  type LinkRow
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

  /** The active links of `type` keyed by their PMSPA id; none without a connected account. */
  private async activeLinks(
    userId: string,
    type: "project" | "task"
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
