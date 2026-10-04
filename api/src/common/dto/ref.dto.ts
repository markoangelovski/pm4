import { ApiProperty } from "@nestjs/swagger";

/**
 * A reference to a project, task, or other entity within PM4 (endpoints.md *Shared
 * project and task shapes*). `deleted` reflects whether the entity is in the trash.
 */
export class RefDto {
  @ApiProperty({ type: String, nullable: true })
  id: string | null;

  title: string;

  deleted: boolean;
}
