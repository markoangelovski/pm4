import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

/** RFC 9457 Problem Details, as the API sends them (conventions.md#errors). */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  errors?: { field: string; message: string }[];
  [extension: string]: unknown;
}

function isProblemDetails(value: unknown): value is ProblemDetails {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.type === "string" && typeof candidate.status === "number"
  );
}

/** A non-2xx API response. `problem` is the body when it was Problem Details, else null. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: ProblemDetails | null
  ) {
    super(problem?.detail ?? `HTTP ${status}`);
    this.name = "ApiError";
  }

  /** The last path segment of `problem.type` ("not-found", "in-trash", "validation", …), or null. */
  get slug(): string | null {
    const type = this.problem?.type;
    if (!type) return null;
    const segment = type.replace(/\/+$/, "").split("/").pop();
    return segment ? segment : null;
  }
}

function toApiError(error: unknown, response: Response): ApiError {
  return new ApiError(response.status, isProblemDetails(error) ? error : null);
}

/** openapi-fetch result → data; a non-2xx response → throws ApiError (body kept when it's Problem Details). */
export function unwrap<T>(result: {
  data?: T;
  error?: unknown;
  response: Response;
}): T {
  if (!result.response.ok) throw toApiError(result.error, result.response);
  return result.data as T;
}

/** For 204 endpoints: throws ApiError unless response.ok. */
export function unwrapVoid(result: {
  error?: unknown;
  response: Response;
}): void {
  if (!result.response.ok) throw toApiError(result.error, result.response);
}

/** True for an ApiError, optionally with the given status and `slug`. */
export function isApiError(
  e: unknown,
  status?: number,
  slug?: string
): e is ApiError {
  if (!(e instanceof ApiError)) return false;
  if (status !== undefined && e.status !== status) return false;
  if (slug !== undefined && e.slug !== slug) return false;
  return true;
}

/** Sets a form error for each `errors[]` entry whose field is in `fieldMap` (API field → form field); returns true if any was set. */
export function applyFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fieldMap: Partial<Record<string, Path<T>>>
): boolean {
  if (!isApiError(error)) return false;
  const seen = new Set<Path<T>>();
  for (const { field, message } of error.problem?.errors ?? []) {
    const formField = Object.hasOwn(fieldMap, field)
      ? fieldMap[field]
      : undefined;
    if (formField === undefined || seen.has(formField)) continue;
    seen.add(formField);
    setError(formField, { type: "server", message });
  }
  return seen.size > 0;
}
