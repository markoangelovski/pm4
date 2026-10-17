import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  PmspaLinkDetailDto,
  PmspaLinkDto
} from "./dto/pmspa-links.dto.js";
import { PmspaConnectionRepository } from "./pmspa-connection.repository.js";
import {
  PmspaLinksRepository,
  type PmspaLinkType
} from "./pmspa-links.repository.js";
import { PmspaRemote } from "./pmspa-remote.js";

/** The PM4 links of the caller (API-INT-012…014, FR-INT-010). Nothing is stored beyond the link rows. */
@Injectable()
export class PmspaLinksService {
  constructor(
    private readonly links: PmspaLinksRepository,
    private readonly connections: PmspaConnectionRepository,
    private readonly remote: PmspaRemote
  ) {}

  /** The active links of `type` (API-INT-012): no connection or no account yet → []. No PMSPA call. */
  async list(userId: string, type: PmspaLinkType): Promise<PmspaLinkDto[]> {
    const pmspaUserId = await this.connectedAccount(userId);
    if (pmspaUserId === null) return [];
    const rows = await this.links.active(userId, pmspaUserId, type);
    return rows.map((row) => ({
      pm4Id: row.pm4Id,
      origin: row.origin,
      syncedAt: row.syncedAt.toISOString()
    }));
  }

  /** Deletes the link of the PM4 record (API-INT-013). Both records stay. */
  async unlink(userId: string, type: PmspaLinkType, id: string): Promise<void> {
    if (!(await this.links.delete(userId, type, id))) {
      throw new NotFoundException("Link not found.");
    }
  }

  /**
   * The active link of the PM4 record and its PMSPA record, read live (API-INT-014).
   * Time-log links arrive with feat-int-time-api, so until then they have no detail (404).
   */
  async detail(
    userId: string,
    type: PmspaLinkType,
    id: string
  ): Promise<PmspaLinkDetailDto> {
    const pmspaUserId = await this.connectedAccount(userId);
    const link =
      type === "time-log" || pmspaUserId === null
        ? null
        : await this.links.byPm4(userId, type, id);
    if (!link || link.pmspaUserId !== pmspaUserId) {
      throw new NotFoundException("Link not found.");
    }

    const pmspa =
      type === "project"
        ? await this.projectDetail(userId, link.pmspaId)
        : await this.taskDetail(userId, link.pmspaId);
    return {
      origin: link.origin,
      syncedAt: link.syncedAt.toISOString(),
      pmspa
    };
  }

  /** The account the saved connection is for, or null. */
  private async connectedAccount(userId: string): Promise<string | null> {
    const row = await this.connections.find(userId);
    return row?.pmspaUserId ?? null;
  }

  private async projectDetail(userId: string, pmspaId: string) {
    const project = await this.remote.getProject(userId, pmspaId);
    if (!project) return null;
    return {
      type: "project" as const,
      title: project.title,
      lead: project.pl ?? "",
      done: project.done
    };
  }

  private async taskDetail(userId: string, pmspaId: string) {
    const task = await this.remote.getTask(userId, pmspaId);
    if (!task) return null;
    const project = await this.remote.getProject(userId, task.projectId);
    return {
      type: "task" as const,
      title: task.title,
      projectTitle: project?.title ?? "",
      column: task.column
    };
  }
}
