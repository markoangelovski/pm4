import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query
} from "@nestjs/common";
import { ApiBearerAuth, ApiNoContentResponse } from "@nestjs/swagger";
import { ApiProblemResponses } from "../common/decorators/api-problem-responses/api-problem-responses.decorator.js";
import {
  type AuthUser,
  CurrentUser
} from "../common/decorators/current-user/current-user.decorator.js";
import { ListNotesQueryDto } from "./dto/list-notes-query.dto.js";
import { NoteInputDto } from "./dto/note-input.dto.js";
import {
  NoteListResponseDto,
  NoteResponseDto
} from "./dto/note-response.dto.js";
import { NotesService } from "./notes.service.js";

/** `/api/v1/notes` (API-NOTE-001…004). */
@ApiBearerAuth("bearer")
@Controller("notes")
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  /** The caller's notes (API-NOTE-001). */
  @Get()
  @ApiProblemResponses(400, 401)
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListNotesQueryDto
  ): Promise<NoteListResponseDto> {
    return this.notesService.list(user.id, query);
  }

  /** Create a note (API-NOTE-002). */
  @Post()
  @ApiProblemResponses(400, 401, 404)
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: NoteInputDto
  ): Promise<NoteResponseDto> {
    return this.notesService.create(user.id, dto);
  }

  /** Replace the note's title and body, and its link when given (API-NOTE-003). */
  @Patch(":id")
  @ApiProblemResponses(400, 401, 404)
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: NoteInputDto
  ): Promise<NoteResponseDto> {
    return this.notesService.update(user.id, id, dto);
  }

  /** Delete the note permanently (API-NOTE-004). */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: "Deleted." })
  @ApiProblemResponses(401, 404)
  remove(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string
  ): Promise<void> {
    return this.notesService.remove(user.id, id);
  }
}
