import { OmitType } from "@nestjs/swagger";
import { ListNotesQueryDto } from "./list-notes-query.dto.js";

/** `GET /todos` query (API-TODO-001): the notes filter, search, sort and range, without paging. */
export class ListTodosQueryDto extends OmitType(ListNotesQueryDto, [
  "page",
  "pageSize"
] as const) {}
