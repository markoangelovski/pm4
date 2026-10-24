import { ApiProperty } from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength
} from "class-validator";
import { Trim, TrimToNull } from "../../common/validation/transforms.js";

/** `POST /notes` and `PATCH /notes/{id}` body (API-NOTE-002, API-NOTE-003). */
export class NoteInputDto {
  /** ≤ 200 chars; absent, `null` or empty after trimming → `null`. */
  @ApiProperty({ type: String, nullable: true, required: false })
  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(200)
  title?: string | null;

  /** Markdown, 1–10000 chars after trimming, stored as written. */
  @ApiProperty({ type: String, minLength: 1, maxLength: 10000 })
  @Trim()
  @IsString()
  @Length(1, 10000)
  body: string;

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
