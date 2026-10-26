import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  MaxLength,
  Validate
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import {
  Trim,
  TrimEach,
  TrimToNull
} from "../../common/validation/transforms.js";
import { UniqueIgnoringCase } from "../../common/validation/unique-ignoring-case.js";

/** `POST /projects` body (API-PRJ-001). */
export class CreateProjectDto {
  /** 1–200 chars after trimming. */
  @Trim()
  @IsString()
  @Length(1, 200)
  title: string;

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

  /** The project's service names (OQ-243, OQ-244): each 1–50 chars after trimming, at most 20, unique ignoring case; absent = none. */
  @ApiProperty({ type: [String], required: false, maxItems: 20 })
  @IsOptional()
  @TrimEach()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Length(1, 50, { each: true })
  @Validate(UniqueIgnoringCase)
  services?: string[];
}
