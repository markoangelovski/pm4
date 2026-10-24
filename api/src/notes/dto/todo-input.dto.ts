import { ApiProperty } from "@nestjs/swagger";
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateIf
} from "class-validator";
import { Trim } from "../../common/validation/transforms.js";

/**
 * `POST /todos` and `PATCH /todos/{id}` body (API-TODO-002, API-TODO-003). `text` is optional here;
 * the create rejects a missing one in the service (D4).
 */
export class TodoInputDto {
  /** 1–500 chars after trimming; not `null`. */
  @ApiProperty({ type: String, minLength: 1, maxLength: 500, required: false })
  @ValidateIf((o: TodoInputDto) => o.text !== undefined)
  @Trim()
  @IsString()
  @Length(1, 500)
  text?: string;

  /** `true` ticks it off, `false` reopens it; not `null`. */
  @ApiProperty({ type: Boolean, required: false })
  @ValidateIf((o: TodoInputDto) => o.done !== undefined)
  @IsBoolean()
  done?: boolean;

  @ApiProperty({
    type: String,
    format: "uuid",
    nullable: true,
    required: false
  })
  @IsOptional()
  @IsUUID()
  projectId?: string | null;

  @ApiProperty({
    type: String,
    format: "uuid",
    nullable: true,
    required: false
  })
  @IsOptional()
  @IsUUID()
  taskId?: string | null;
}
