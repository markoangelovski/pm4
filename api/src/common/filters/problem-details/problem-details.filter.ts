import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from "@nestjs/common";
import type { Request, Response } from "express";
import { AppConfigService } from "../../../config/app-config.service.js";
import { ProblemDetailsDto } from "./problem-details.dto.js";
import { FieldError } from "../../validation/flatten-validation-errors.js";

/** RFC 9457 slugs, per `specs/03-api/conventions.md#errors`. */
const SLUG_BY_STATUS: Record<number, string> = {
  400: "validation",
  401: "unauthorized",
  403: "forbidden",
  404: "not-found",
  409: "conflict",
  429: "rate-limited",
  500: "internal"
};

const TITLE_BY_STATUS: Record<number, string> = {
  400: "Validation failed",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  429: "Too Many Requests",
  500: "Internal Server Error"
};

/** Members an extension may never overwrite (D10). */
const STANDARD_MEMBERS = new Set([
  "type",
  "title",
  "status",
  "detail",
  "errors"
]);

/**
 * Converts every thrown exception into an RFC 9457
 * `application/problem+json` response. Registered as a global filter in
 * `app.setup.ts` (`app.useGlobalFilters(app.get(ProblemDetailsFilter))` so it
 * gets `AppConfigService` injected).
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionsHandler");

  constructor(private readonly configService: AppConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const described = this.describe(exception);
    const slug =
      described.problemType ?? SLUG_BY_STATUS[described.status] ?? "error";

    if (described.status >= 500) {
      const cause =
        exception instanceof Error
          ? (exception.stack ?? exception.message)
          : String(exception);
      this.logger.error(
        `${request.method} ${request.originalUrl ?? request.url} -> ${described.status}: ${cause}`
      );
    }

    const body: ProblemDetailsDto & Record<string, unknown> = {
      type: `${this.configService.webAppUrl}/errors/${slug}`,
      title: described.title,
      status: described.status,
      detail: described.detail,
      ...(described.errors ? { errors: described.errors } : {})
    };
    // Extension members (D10) go after the standard ones and never replace them.
    for (const [key, value] of Object.entries(described.extensions ?? {})) {
      if (!STANDARD_MEMBERS.has(key)) body[key] = value;
    }

    response
      .status(described.status)
      .type("application/problem+json")
      .send(body);
  }

  private describe(exception: unknown): {
    status: number;
    title: string;
    detail: string;
    errors?: FieldError[];
    problemType?: string;
    extensions?: Record<string, unknown>;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const title = TITLE_BY_STATUS[status] ?? exception.name;
      const { problemType, extensions } = this.extractProblemType(
        exception.getResponse()
      );

      if (status === 400) {
        const errors = this.extractFieldErrors(exception.getResponse());
        if (errors) {
          return {
            status,
            title,
            detail: "One or more fields are invalid.",
            errors
          };
        }
      }

      return {
        status,
        title,
        // A 500 keeps the default type and carries no extensions.
        ...(status < 500 ? { problemType, extensions } : {}),
        // A 500 never leaks internals (conventions.md#errors), even one an
        // exception constructor was handed by mistake.
        detail:
          status >= 500
            ? "An unexpected error occurred."
            : this.extractDetail(exception)
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      title: TITLE_BY_STATUS[HttpStatus.INTERNAL_SERVER_ERROR],
      // Never leak internals of an unexpected error (conventions.md#errors).
      detail: "An unexpected error occurred."
    };
  }

  /**
   * A non-default Problem type (D10): an exception response object with a
   * string `problemType` (the slug) and optional object `extensions` (extra
   * body members), e.g. `InTrashException`.
   */
  private extractProblemType(response: unknown): {
    problemType?: string;
    extensions?: Record<string, unknown>;
  } {
    if (!response || typeof response !== "object") return {};
    const { problemType, extensions } = response as {
      problemType?: unknown;
      extensions?: unknown;
    };
    return {
      problemType: typeof problemType === "string" ? problemType : undefined,
      extensions:
        extensions &&
        typeof extensions === "object" &&
        !Array.isArray(extensions)
          ? (extensions as Record<string, unknown>)
          : undefined
    };
  }

  private extractFieldErrors(response: unknown): FieldError[] | undefined {
    if (
      response &&
      typeof response === "object" &&
      Array.isArray((response as { errors?: unknown }).errors)
    ) {
      return (response as { errors: FieldError[] }).errors;
    }
    return undefined;
  }

  private extractDetail(exception: HttpException): string {
    const response = exception.getResponse();
    if (typeof response === "string") {
      return response;
    }
    const message =
      (response as { message?: string | string[] })?.message ??
      exception.message;
    return Array.isArray(message) ? message.join(" ") : message;
  }
}
