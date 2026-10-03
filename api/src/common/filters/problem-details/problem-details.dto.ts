import { ApiProperty } from "@nestjs/swagger";
import { FieldError } from "../../validation/flatten-validation-errors.js";

/** One invalid field of a `400` (conventions.md#errors). */
export class FieldErrorDto implements FieldError {
  /** Dot path of the field, e.g. `address.city`. */
  field: string;
  /** What is wrong with it. */
  message: string;
}

/** RFC 9457 Problem Details, served as `application/problem+json`. */
export class ProblemDetailsDto {
  /** `<WEB_APP_URL>/errors/<slug>`, e.g. `https://pm4.angelovski.top/errors/validation`. */
  type: string;
  /** Short summary of the status, e.g. `Validation failed`. */
  title: string;
  /** The HTTP status code. */
  @ApiProperty({ type: "integer", example: 400 })
  status: number;
  /** Human-readable explanation. */
  detail: string;
  /** Only on a `400` validation error: one entry per failed constraint. */
  errors?: FieldErrorDto[];
}
