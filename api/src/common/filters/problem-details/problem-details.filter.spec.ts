import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { vi, type MockInstance } from "vitest";
import { AppConfigService } from "../../../config/app-config.service.js";
import { ProblemDetailsFilter } from "./problem-details.filter.js";
import { ProblemException } from "./problem-exception.js";

interface ProblemDetailsBody {
  type: string;
  title: string;
  status: number;
  detail: string;
  errors?: unknown;
}

function createHost() {
  const send = vi.fn<(body: ProblemDetailsBody) => void>();
  const type = vi
    .fn<(contentType: string) => { send: typeof send }>()
    .mockReturnValue({ send });
  const status = vi
    .fn<(code: number) => { type: typeof type }>()
    .mockReturnValue({ type });
  const response = { status, type, send };
  const request = {
    method: "GET",
    url: "/api/v1/whatever",
    originalUrl: "/api/v1/whatever"
  };

  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request
    })
  } as unknown as ArgumentsHost;

  return { host, status, type, send };
}

describe("ProblemDetailsFilter", () => {
  let filter: ProblemDetailsFilter;
  let errorLog: MockInstance<(...args: unknown[]) => void>;
  let warnLog: MockInstance<(...args: unknown[]) => void>;
  const configService = {
    webAppUrl: "https://pm4.example.com"
  } as AppConfigService;

  beforeEach(() => {
    filter = new ProblemDetailsFilter(configService);
    errorLog = vi
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
    errorLog.mockClear();
    warnLog = vi
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => undefined);
    warnLog.mockClear();
  });

  it("400: formats a validation error with field errors", () => {
    const { host, status, type, send } = createHost();
    const exception = new BadRequestException({
      errors: [{ field: "note", message: "must not be empty" }]
    });

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(400);
    expect(type).toHaveBeenCalledWith("application/problem+json");
    expect(send).toHaveBeenCalledWith({
      type: "https://pm4.example.com/errors/validation",
      title: "Validation failed",
      status: 400,
      detail: "One or more fields are invalid.",
      errors: [{ field: "note", message: "must not be empty" }]
    });
  });

  it("401: formats an unauthorized error without an errors array", () => {
    const { host, send } = createHost();

    filter.catch(new UnauthorizedException(), host);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "https://pm4.example.com/errors/unauthorized",
        title: "Unauthorized",
        status: 401
      })
    );
    expect(send.mock.calls[0]?.[0].errors).toBeUndefined();
  });

  it("404: formats a not-found error", () => {
    const { host, send } = createHost();

    filter.catch(new NotFoundException("Cannot GET /nope"), host);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "https://pm4.example.com/errors/not-found",
        title: "Not Found",
        status: 404,
        detail: "Cannot GET /nope"
      })
    );
  });

  it("409: formats a conflict error", () => {
    const { host, send } = createHost();

    filter.catch(new ConflictException("already exists"), host);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "https://pm4.example.com/errors/conflict",
        status: 409
      })
    );
  });

  it("429: formats a rate-limited error", () => {
    const { host, send } = createHost();

    filter.catch(
      new HttpException("Too many requests", HttpStatus.TOO_MANY_REQUESTS),
      host
    );

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "https://pm4.example.com/errors/rate-limited",
        status: 429
      })
    );
  });

  it("500: formats an unexpected HttpException without leaking internals", () => {
    const { host, send } = createHost();

    filter.catch(new HttpException("DB connection string leaked", 500), host);

    expect(send).toHaveBeenCalledWith({
      type: "https://pm4.example.com/errors/internal",
      title: "Internal Server Error",
      status: 500,
      detail: "An unexpected error occurred."
    });
  });

  it("500: formats a non-HttpException error without leaking internals", () => {
    const { host, send, status } = createHost();

    filter.catch(new Error("password=hunter2"), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(send).toHaveBeenCalledWith({
      type: "https://pm4.example.com/errors/internal",
      title: "Internal Server Error",
      status: 500,
      detail: "An unexpected error occurred."
    });
  });

  it("ProblemException: uses its slug, title and detail, and spreads its extensions", () => {
    const { host, send, status } = createHost();

    filter.catch(
      new ProblemException(
        503,
        "pmspa-rate-limited",
        "PMSPA is busy",
        "PMSPA is busy. Try again later.",
        {
          retryAfterSeconds: 30
        }
      ),
      host
    );

    expect(status).toHaveBeenCalledWith(503);
    expect(send).toHaveBeenCalledWith({
      type: "https://pm4.example.com/errors/pmspa-rate-limited",
      title: "PMSPA is busy",
      status: 503,
      detail: "PMSPA is busy. Try again later.",
      retryAfterSeconds: 30
    });
  });

  it("ProblemException: shows the detail for a 502 instead of masking it", () => {
    const { host, send } = createHost();

    filter.catch(
      new ProblemException(
        502,
        "pmspa-error",
        "PMSPA failed",
        "PMSPA answered with an error."
      ),
      host
    );

    expect(send).toHaveBeenCalledWith({
      type: "https://pm4.example.com/errors/pmspa-error",
      title: "PMSPA failed",
      status: 502,
      detail: "PMSPA answered with an error."
    });
  });

  it("ProblemException: logs a 5xx at warn with status and slug, no stack, never at error", () => {
    const { host } = createHost();

    filter.catch(
      new ProblemException(
        503,
        "pmspa-rate-limited",
        "PMSPA is busy",
        "PMSPA is busy. Try again later.",
        { retryAfterSeconds: 30 }
      ),
      host
    );

    expect(warnLog).toHaveBeenCalledTimes(1);
    const message = String(warnLog.mock.calls[0]?.[0]);
    expect(message).toContain("503");
    expect(message).toContain("pmspa-rate-limited");
    expect(message).not.toContain("\n    at ");
    expect(errorLog).not.toHaveBeenCalled();
  });

  it("other 5xx errors still log at error with the stack", () => {
    const { host } = createHost();
    filter.catch(new Error("boom"), host);

    expect(errorLog).toHaveBeenCalledTimes(1);
    expect(String(errorLog.mock.calls[0]?.[0])).toContain("boom");
  });
});
