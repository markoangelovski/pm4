import { Inject, Injectable } from "@nestjs/common";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { escapeLike } from "../common/sql/escape-like.js";
import { DRIZZLE, type DrizzleDb } from "../database/drizzle.js";
import { projects, tasks, users } from "../database/schema/index.js";
import type { LeadRow } from "../users/project-lead.service.js";
import type { ProjectSort } from "./dto/list-projects-query.dto.js";

/** The writable columns of a project. */
export interface ProjectValues {
  title: string;
  description: string | null;
  externalLink: string | null;
  projectLeadUserId: string | null;
  projectLead: string | null;
}

/** A project with its lead user's current name/avatar and its live task counts. */
export interface ProjectRow extends LeadRow {
  id: string;
  title: string;
  description: string | null;
  externalLink: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  counts: { upcoming: number; inProgress: number; completed: number };
}

const lead = alias(users, "lead");

const ORDER_BY: Record<ProjectSort, SQL[]> = {
  "updatedAt:desc": [desc(projects.updatedAt), desc(projects.id)],
  "updatedAt:asc": [asc(projects.updatedAt), desc(projects.id)],
  "createdAt:desc": [desc(projects.createdAt), desc(projects.id)],
  "createdAt:asc": [asc(projects.createdAt), desc(projects.id)],
  "title:asc": [asc(sql`lower(${projects.title})`), desc(projects.id)],
  "title:desc": [desc(sql`lower(${projects.title})`), desc(projects.id)]
};

/** Data access for `projects`. Every method is scoped by `userId`. */
@Injectable()
export class ProjectsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async insert(userId: string, values: ProjectValues): Promise<string> {
    const [row] = await this.db
      .insert(projects)
      .values({ ...values, userId })
      .returning({ id: projects.id });
    return row.id;
  }

  /** The caller's project, including a trashed one (`deletedAt` set). */
  async findById(userId: string, id: string): Promise<ProjectRow | null> {
    const [row] = await this.selectRows(userId, id)
      .where(and(eq(projects.userId, userId), eq(projects.id, id)))
      .limit(1);
    return row ? toRow(row) : null;
  }

  /** A page of the caller's active projects, plus the total that match. */
  async list(
    userId: string,
    q: string | null,
    sort: ProjectSort,
    page: number,
    pageSize: number
  ): Promise<{ rows: ProjectRow[]; total: number }> {
    const pattern = q ? `%${escapeLike(q)}%` : null;
    const titleMatch = pattern ? ilike(projects.title, pattern) : undefined;
    // The lead's read-model name: the user's current name, else the saved text.
    const leadName = sql`coalesce(${lead.displayName}, ${projects.projectLead})`;
    const where = and(
      eq(projects.userId, userId),
      isNull(projects.deletedAt),
      pattern ? or(titleMatch, ilike(leadName, pattern)) : undefined
    );
    const orderBy = titleMatch
      ? [sql`(${titleMatch}) desc`, ...ORDER_BY[sort]]
      : ORDER_BY[sort];
    const [rows, [{ total }]] = await Promise.all([
      this.selectRows(userId)
        .where(where)
        .orderBy(...orderBy)
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db
        .select({ total: count() })
        .from(projects)
        .leftJoin(lead, eq(lead.id, projects.projectLeadUserId))
        .where(where)
    ]);
    return { rows: rows.map(toRow), total };
  }

  /** Sets the given columns and `updatedAt = now()`. */
  async update(
    userId: string,
    id: string,
    values: Partial<ProjectValues>
  ): Promise<void> {
    await this.db
      .update(projects)
      .set({ ...values, updatedAt: sql`now()` })
      .where(
        and(
          eq(projects.userId, userId),
          eq(projects.id, id),
          isNull(projects.deletedAt)
        )
      );
  }

  /**
   * Moves an active project to the trash, or a trashed one out of it; doesn't
   * touch `updatedAt`. A row already in the target state is left alone.
   */
  async setDeletedAt(
    userId: string,
    id: string,
    deletedAt: Date | null
  ): Promise<void> {
    await this.db
      .update(projects)
      .set({ deletedAt })
      .where(
        and(
          eq(projects.userId, userId),
          eq(projects.id, id),
          deletedAt === null
            ? isNotNull(projects.deletedAt)
            : isNull(projects.deletedAt)
        )
      );
  }

  /**
   * `projects` with the lead user (`LEFT JOIN users AS lead`) and the counts of
   * the caller's tasks that aren't individually deleted, per project.
   */
  private selectRows(userId: string, projectId?: string) {
    const c = this.db
      .select({
        projectId: tasks.projectId,
        upcoming:
          sql<number>`count(*) FILTER (WHERE ${tasks.status} = 'upcoming')`.as(
            "upcoming"
          ),
        inProgress:
          sql<number>`count(*) FILTER (WHERE ${tasks.status} = 'in-progress')`.as(
            "in_progress"
          ),
        completed:
          sql<number>`count(*) FILTER (WHERE ${tasks.status} = 'completed')`.as(
            "completed"
          )
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          isNull(tasks.deletedAt),
          projectId ? eq(tasks.projectId, projectId) : undefined
        )
      )
      .groupBy(tasks.projectId)
      .as("c");

    return this.db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        externalLink: projects.externalLink,
        projectLeadUserId: projects.projectLeadUserId,
        projectLead: projects.projectLead,
        leadDisplayName: lead.displayName,
        leadAvatarUrl: lead.avatarUrl,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        deletedAt: projects.deletedAt,
        upcoming: sql<number>`coalesce(${c.upcoming}, 0)`.mapWith(Number),
        inProgress: sql<number>`coalesce(${c.inProgress}, 0)`.mapWith(Number),
        completed: sql<number>`coalesce(${c.completed}, 0)`.mapWith(Number)
      })
      .from(projects)
      .leftJoin(lead, eq(lead.id, projects.projectLeadUserId))
      .leftJoin(c, eq(c.projectId, projects.id))
      .$dynamic();
  }
}

type SelectedRow = Omit<ProjectRow, "counts"> & ProjectRow["counts"];

function toRow({
  upcoming,
  inProgress,
  completed,
  ...rest
}: SelectedRow): ProjectRow {
  return { ...rest, counts: { upcoming, inProgress, completed } };
}
