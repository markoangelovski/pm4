import { BadRequestException, Injectable } from "@nestjs/common";
import { ProjectLeadDto } from "./dto/project-lead.dto.js";
import { UsersRepository } from "./users.repository.js";

/** The two lead columns of `projects` / `tasks` (data-model.md *Project lead*). */
export interface LeadColumns {
  projectLeadUserId: string | null;
  projectLead: string | null;
}

/** A row's lead columns plus the lead user's current name and avatar (`LEFT JOIN users AS lead`). */
export interface LeadRow {
  projectLeadUserId: string | null;
  projectLead: string | null;
  leadDisplayName: string | null;
  leadAvatarUrl: string | null;
}

/** The lead input fields of a create/update body (D8). */
export interface LeadInput {
  projectLeadUserId?: string | null;
  projectLeadName?: string | null;
}

/**
 * The project lead logic shared by projects and tasks (D9): validates the
 * input, computes the stored columns and builds the `ProjectLead` read model.
 */
@Injectable()
export class ProjectLeadService {
  constructor(private readonly usersRepository: UsersRepository) {}

  /**
   * POST: a missing field means `null`. PATCH (`partial`): both fields absent →
   * `undefined` (leave the lead unchanged); otherwise the lead is replaced as a unit.
   */
  async toColumns(
    input: LeadInput,
    partial: boolean
  ): Promise<LeadColumns | undefined> {
    const userId = input.projectLeadUserId ?? null;
    const name = input.projectLeadName ?? null;

    if (
      partial &&
      input.projectLeadUserId === undefined &&
      input.projectLeadName === undefined
    ) {
      return undefined;
    }

    if (userId !== null && name !== null) {
      throw new BadRequestException({
        errors: [
          {
            field: "projectLeadName",
            message: "must be empty when projectLeadUserId is set"
          }
        ]
      });
    }

    if (userId !== null) {
      const user = await this.usersRepository.findLeadUser(userId);
      if (!user) {
        throw new BadRequestException({
          errors: [
            { field: "projectLeadUserId", message: "must be an existing user" }
          ]
        });
      }
      return { projectLeadUserId: user.id, projectLead: user.displayName };
    }

    return { projectLeadUserId: null, projectLead: name };
  }

  /** The `ProjectLead` read model; the saved name is the fallback once the user is gone (D2). */
  toDto(row: LeadRow): ProjectLeadDto | null {
    if (row.projectLeadUserId !== null && row.leadDisplayName !== null) {
      return {
        kind: "user",
        name: row.leadDisplayName,
        user: {
          id: row.projectLeadUserId,
          displayName: row.leadDisplayName,
          avatarUrl: row.leadAvatarUrl
        }
      };
    }
    if (row.projectLead !== null) {
      return { kind: "text", name: row.projectLead, user: null };
    }
    return null;
  }
}
