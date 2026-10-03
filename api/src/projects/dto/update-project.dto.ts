import {
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  MaxLength,
  ValidateIf
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Trim, TrimToNull } from "../../common/validation/transforms.js";

/**
 * `PATCH /projects/{id}` body (API-PRJ-004): the create fields, all optional;
 * `title` may not be `null`. The lead is replaced as a unit when either lead
 * field is present.
 */
export class UpdateProjectDto {
  /** 1–200 chars after trimming; not `null`. */
  @ApiProperty({ type: String, required: false, minLength: 1, maxLength: 200 })
  @ValidateIf((o: UpdateProjectDto) => o.title !== undefined)
  @Trim()
  @IsString()
  @Length(1, 200)
  title?: string;

  /** ≤ 2000 chars; empty after trimming → `null`. */
  @ApiProperty({ type: String, nullable: true, required: false })
  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  /** Absolute `http(s)://` URL, ≤ 500 chars; empty after trimming → `null`. */
  @ApiProperty({ type: String, nullable: true, required: false })
  @IsOptional()
  @TrimToNull()
  @IsUrl({ protocols: ["http", "https"], require_protocol: true })
  @MaxLength(500)
  externalLink?: string | null;

  /** A registered user as the lead; excludes `projectLeadName`. */
  @ApiProperty({
    type: String,
    format: "uuid",
    nullable: true,
    required: false
  })
  @IsOptional()
  @IsUUID()
  projectLeadUserId?: string | null;

  /** A free-text lead name, ≤ 100 chars; empty after trimming → `null`. */
  @ApiProperty({ type: String, nullable: true, required: false })
  @IsOptional()
  @TrimToNull()
  @IsString()
  @MaxLength(100)
  projectLeadName?: string | null;
}
