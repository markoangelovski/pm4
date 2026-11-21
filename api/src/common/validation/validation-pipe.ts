import { BadRequestException, ValidationPipe } from "@nestjs/common";
import type { ValidationPipeOptions } from "@nestjs/common";
import { flattenValidationErrors } from "./flatten-validation-errors.js";

/** The global validation options, shared with the MCP tools. */
export const VALIDATION_PIPE_OPTIONS: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  exceptionFactory: (errors) =>
    new BadRequestException({ errors: flattenValidationErrors(errors) })
};

/** Validates `value` against a DTO class like a request would: the instance, or a `BadRequestException({ errors })`. */
export function validateDto<T extends object>(
  cls: new () => T,
  value: Record<string, unknown>,
  type: "body" | "query"
): Promise<T> {
  return new ValidationPipe(VALIDATION_PIPE_OPTIONS).transform(value, {
    type,
    metatype: cls
  }) as Promise<T>;
}
