/* eslint-disable @typescript-eslint/no-unused-vars -- stubs (feat-note-todos) */
import { Injectable } from "@nestjs/common";
import { ListNotesQueryDto } from "./dto/list-notes-query.dto.js";
import { NoteInputDto } from "./dto/note-input.dto.js";
import {
  NoteListResponseDto,
  NoteResponseDto
} from "./dto/note-response.dto.js";

/** Notes (API-NOTE-001…004), scoped to the caller. */
@Injectable()
export class NotesService {
  /** A page of the caller's notes (API-NOTE-001). */
  list(userId: string, query: ListNotesQueryDto): Promise<NoteListResponseDto> {
    throw new Error("not implemented (feat-note-todos)");
  }

  /** Create a note (API-NOTE-002). */
  create(userId: string, dto: NoteInputDto): Promise<NoteResponseDto> {
    throw new Error("not implemented (feat-note-todos)");
  }

  /** Replace a note's title, body and (when given) link (API-NOTE-003). */
  update(
    userId: string,
    id: string,
    dto: NoteInputDto
  ): Promise<NoteResponseDto> {
    throw new Error("not implemented (feat-note-todos)");
  }

  /** Delete a note permanently (API-NOTE-004). */
  remove(userId: string, id: string): Promise<void> {
    throw new Error("not implemented (feat-note-todos)");
  }
}
