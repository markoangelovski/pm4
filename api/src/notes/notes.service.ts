import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { isUUID } from "class-validator";
import { toRef } from "../time/time-logs.service.js";
import { UsersRepository } from "../users/users.repository.js";
import { ListNotesQueryDto } from "./dto/list-notes-query.dto.js";
import { NoteInputDto } from "./dto/note-input.dto.js";
import {
  NoteListResponseDto,
  NoteResponseDto
} from "./dto/note-response.dto.js";
import { ItemLinkService } from "./item-link.service.js";
import { type NoteRow, NotesRepository } from "./notes.repository.js";

function toNoteDto(row: NoteRow): NoteResponseDto {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    project: toRef(row.projectId, row.projectTitle, row.deletedProjectTitle),
    task: toRef(row.taskId, row.taskTitle, row.deletedTaskTitle),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

/** Notes (API-NOTE-001…004), scoped to the caller. */
@Injectable()
export class NotesService {
  constructor(
    private readonly notesRepository: NotesRepository,
    private readonly usersRepository: UsersRepository,
    private readonly itemLinkService: ItemLinkService
  ) {}

  /** A page of the caller's notes (API-NOTE-001). */
  async list(
    userId: string,
    query: ListNotesQueryDto
  ): Promise<NoteListResponseDto> {
    const { projectId, taskId, from, to } = query;
    const unlinked = query.unlinked === true;
    if (
      [projectId !== undefined, taskId !== undefined, unlinked].filter(Boolean)
        .length > 1
    ) {
      throw new BadRequestException({
        errors: [
          {
            field: "projectId",
            message: "use at most one of projectId, taskId and unlinked"
          }
        ]
      });
    }
    if (from !== undefined && to !== undefined && from > to) {
      throw new BadRequestException({
        errors: [{ field: "from", message: "must not be after to" }]
      });
    }
    let timeZone: string | undefined;
    if (from !== undefined || to !== undefined) {
      timeZone = (await this.usersRepository.findById(userId))?.timeZone;
    }
    const { rows, total } = await this.notesRepository.list(
      userId,
      { projectId, taskId, unlinked, q: query.q, from, to, timeZone },
      query.sort,
      query.page,
      query.pageSize
    );
    return {
      items: rows.map(toNoteDto),
      page: query.page,
      pageSize: query.pageSize,
      total
    };
  }

  /** Create a note (API-NOTE-002). */
  async create(userId: string, dto: NoteInputDto): Promise<NoteResponseDto> {
    const link = await this.itemLinkService.resolve(
      userId,
      dto.taskId,
      dto.projectId,
      null
    );
    const id = await this.notesRepository.insert(userId, {
      title: dto.title ?? null,
      body: dto.body,
      ...link
    });
    return this.get(userId, id);
  }

  /** Replace a note's title, body and (when given) link (API-NOTE-003). */
  async update(
    userId: string,
    id: string,
    dto: NoteInputDto
  ): Promise<NoteResponseDto> {
    const row = await this.findOwned(userId, id);
    let link: { projectId: string | null; taskId: string | null } | null = null;
    if (dto.taskId !== undefined || dto.projectId !== undefined) {
      link = await this.itemLinkService.resolve(
        userId,
        dto.taskId,
        dto.projectId,
        row
      );
    }
    await this.notesRepository.update(userId, id, {
      title: dto.title ?? null,
      body: dto.body,
      ...(link
        ? { ...link, deletedProjectTitle: null, deletedTaskTitle: null }
        : {})
    });
    return this.get(userId, id);
  }

  /** Delete a note permanently (API-NOTE-004). */
  async remove(userId: string, id: string): Promise<void> {
    const deleted = isUUID(id)
      ? await this.notesRepository.delete(userId, id)
      : false;
    if (!deleted) throw new NotFoundException("Note not found.");
  }

  private async get(userId: string, id: string): Promise<NoteResponseDto> {
    return toNoteDto(await this.findOwned(userId, id));
  }

  private async findOwned(userId: string, id: string): Promise<NoteRow> {
    const row = isUUID(id)
      ? await this.notesRepository.findById(userId, id)
      : null;
    if (!row) throw new NotFoundException("Note not found.");
    return row;
  }
}
