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
import { vi } from "vitest";
import { AppConfigService } from "../../../config/app-config.service.js";
import { InTrashException } from "../../exceptions/in-trash.exception.js";
import { ProblemDetailsFilter } from "./problem-details.filter.js";

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
  const configService = {
    webAppUrl: "https://pm4.example.com"
  } as AppConfigService;

  beforeEach(() => {
    filter = new ProblemDetailsFilter(configService);
    vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
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

    filter.catch(new ConflictException("already restored"), host);

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
});

describe("ProblemDetailsFilter: problemType and extensions (D10)", () => {
  const configService = {
    webAppUrl: "https://pm4.example.com"
  } as AppConfigService;
  const filter = new ProblemDetailsFilter(configService);

  beforeEach(() => {
    vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  });

  it("uses problemType as the slug and keeps the status title", () => {
    const { host, status, send } = createHost();

    filter.catch(new InTrashException("Project is in the trash."), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(send).toHaveBeenCalledWith({
      type: "https://pm4.example.com/errors/in-trash",
      title: "Not Found",
      status: 404,
      detail: "Project is in the trash."
    });
  });

  it("adds extension members after the standard ones", () => {
    const { host, send } = createHost();

    filter.catch(
      new InTrashException("Task is in the trash.", {
        projectId: "p-1",
        projectInTrash: true
      }),
      host
    );

    const body = send.mock.calls[0]?.[0] as unknown as Record<string, unknown>;
    expect(body).toEqual({
      type: "https://pm4.example.com/errors/in-trash",
      title: "Not Found",
      status: 404,
      detail: "Task is in the trash.",
      projectId: "p-1",
      projectInTrash: true
    });
    expect(Object.keys(body)).toEqual([
      "type",
      "title",
      "status",
      "detail",
      "projectId",
      "projectInTrash"
    ]);
  });

  it("never lets an extension overwrite a standard member", () => {
    const { host, send } = createHost();

    filter.catch(
      new NotFoundException({
        message: "Gone.",
        problemType: "in-trash",
        extensions: {
          type: "x",
          title: "x",
          status: 200,
          detail: "x",
          errors: [],
          extra: 1
        }
      }),
      host
    );

    expect(send).toHaveBeenCalledWith({
      type: "https://pm4.example.com/errors/in-trash",
      title: "Not Found",
      status: 404,
      detail: "Gone.",
      extra: 1
    });
  });

  it("ignores a non-string problemType and non-object extensions", () => {
    const { host, send } = createHost();

    filter.catch(
      new NotFoundException({
        message: "Nope.",
        problemType: 42,
        extensions: "x"
      }),
      host
    );

    expect(send).toHaveBeenCalledWith({
      type: "https://pm4.example.com/errors/not-found",
      title: "Not Found",
      status: 404,
      detail: "Nope."
    });
  });

  it("a 500 never takes a problemType or extensions", () => {
    const { host, send } = createHost();

    filter.catch(
      new HttpException(
        { problemType: "in-trash", extensions: { secret: "s" } },
        500
      ),
      host
    );

    expect(send).toHaveBeenCalledWith({
      type: "https://pm4.example.com/errors/internal",
      title: "Internal Server Error",
      status: 500,
      detail: "An unexpected error occurred."
    });
  });
});
