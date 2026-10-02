import { ValidationError } from "@nestjs/common";

export interface FieldError {
  field: string;
  message: string;
}

/**
 * Flattens class-validator's (possibly nested, for object/array properties)
 * `ValidationError[]` into the `{field, message}[]` shape documented in
 * `specs/03-api/conventions.md#errors`. `field` is a dot path
 * (e.g. `address.city`); one entry per failed constraint.
 */
export function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = ""
): FieldError[] {
  return errors.flatMap((error) => {
    const field = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    const ownErrors = Object.values(error.constraints ?? {}).map((message) => ({
      field,
      message
    }));
    const childErrors = error.children?.length
      ? flattenValidationErrors(error.children, field)
      : [];
    return [...ownErrors, ...childErrors];
  });
}
