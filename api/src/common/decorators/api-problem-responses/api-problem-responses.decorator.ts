import { applyDecorators } from "@nestjs/common";
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiServiceUnavailableResponse,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  getSchemaPath
} from "@nestjs/swagger";
import { ProblemDetailsDto } from "../../filters/problem-details/problem-details.dto.js";

export type ProblemStatus = 400 | 401 | 404 | 409 | 502 | 503;

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
  429: {
    decorator: ApiTooManyRequestsResponse,
    description: "Rate limited: `retryAfterSeconds` and `Retry-After`."
  },
  502: {
    decorator: ApiBadGatewayResponse,
    description: "PMSPA failed or couldn't be reached."
  },
  503: {
    decorator: ApiServiceUnavailableResponse,
    description: "PMSPA is busy."
  },
  500: {
    decorator: ApiInternalServerErrorResponse,
    description: "Unexpected error."
  }
} as const;

/**
 * Documents Problem Details error responses (conventions.md#errors): the given
 * statuses, `429` when `limited`, plus `500`, each `application/problem+json`
 * → `ProblemDetailsDto`.
 */
function problemResponses(
  statuses: ProblemStatus[],
  limited: boolean
): MethodDecorator & ClassDecorator {
  const ordered = [
    ...new Set<ProblemStatus | 429 | 500>(
      [...statuses, ...(limited ? [429 as const] : [])].sort((a, b) => a - b)
    )
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

/** Problem Details responses of a rate-limited operation: the given statuses, `429` and `500`. */
export function ApiProblemResponses(
  ...statuses: ProblemStatus[]
): MethodDecorator & ClassDecorator {
  return problemResponses(statuses, true);
}

/** Problem Details responses of an operation that isn't rate limited: the given statuses and `500`. */
export function ApiProblemResponsesNotLimited(
  ...statuses: ProblemStatus[]
): MethodDecorator & ClassDecorator {
  return problemResponses(statuses, false);
}
