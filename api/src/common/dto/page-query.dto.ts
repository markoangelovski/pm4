import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min
} from "class-validator";
import { Trim } from "../validation/transforms.js";

/** `?page`, `?pageSize` and `?q` shared by list endpoints (endpoints.md *Lists*). */
export class PageQueryDto {
  /** 1-based page number. */
  @ApiPropertyOptional({ type: "integer", default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  /** Items per page, 1–100. */
  @ApiPropertyOptional({ type: "integer", default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 25;

  /** Case-insensitive "contains" filter on the title; empty = no filter. */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  q?: string;
}
