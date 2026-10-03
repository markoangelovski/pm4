import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

const NOT_IMPLEMENTED = "not implemented (feat-prj-web)";

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  errors?: { field: string; message: string }[];
  [extension: string]: unknown;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: ProblemDetails | null
  ) {
    super(NOT_IMPLEMENTED);
    throw new Error(NOT_IMPLEMENTED);
  }

  /** The last path segment of `problem.type` ("not-found", "in-trash", "validation", …), or null. */
  get slug(): string | null {
    throw new Error(NOT_IMPLEMENTED);
  }
}

/** openapi-fetch result → data; a non-2xx response → throws ApiError (body kept when it's Problem Details). */
export function unwrap<T>(result: {
  data?: T;
  error?: unknown;
  response: Response;
}): T {
  void result;
  throw new Error(NOT_IMPLEMENTED);
}

/** For 204 endpoints: throws ApiError unless response.ok. */
export function unwrapVoid(result: {
  error?: unknown;
  response: Response;
}): void {
  void result;
  throw new Error(NOT_IMPLEMENTED);
}

export function isApiError(
  e: unknown,
  status?: number,
  slug?: string
): e is ApiError {
  void e;
  void status;
  void slug;
  throw new Error(NOT_IMPLEMENTED);
}

/** Sets a form error for each `errors[]` entry whose field is in `fieldMap` (API field → form field); returns true if any was set. */
export function applyFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fieldMap: Partial<Record<string, Path<T>>>
): boolean {
  void error;
  void setError;
  void fieldMap;
  throw new Error(NOT_IMPLEMENTED);
}
