import { applyDecorators } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  getSchemaPath
} from "@nestjs/swagger";
import { ProblemDetailsDto } from "../../filters/problem-details/problem-details.dto.js";

export type ProblemStatus = 400 | 401 | 404 | 409;

const content = {
  "application/problem+json": {
    schema: { $ref: getSchemaPath(ProblemDetailsDto) }
  }
};

const RESPONSES = {
  400: {
    decorator: ApiBadRequestResponse,
    description: "Validation failed: one entry in errors[] per invalid field."
  },
  401: {
    decorator: ApiUnauthorizedResponse,
    description: "Missing, invalid or expired credentials."
  },
  404: { decorator: ApiNotFoundResponse, description: "Not found." },
  409: { decorator: ApiConflictResponse, description: "Conflict." },
  500: {
    decorator: ApiInternalServerErrorResponse,
    description: "Unexpected error."
  }
} as const;

/**
 * Documents Problem Details error responses (conventions.md#errors):
 * the given statuses plus `500`, each `application/problem+json` → `ProblemDetailsDto`.
 */
export function ApiProblemResponses(
  ...statuses: ProblemStatus[]
): MethodDecorator & ClassDecorator {
  const ordered = [
    ...new Set<ProblemStatus | 500>([...statuses].sort((a, b) => a - b))
  ];
  ordered.push(500);
  return applyDecorators(
    ApiExtraModels(ProblemDetailsDto),
    ...ordered.map((status) => {
      const { decorator, description } = RESPONSES[status];
      return decorator({ description, content });
    })
  );
}
