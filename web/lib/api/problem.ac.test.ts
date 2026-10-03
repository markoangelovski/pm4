import { describe, expect, it, vi } from "vitest";
import {
  ApiError,
  applyFieldErrors,
  unwrap,
  unwrapVoid,
  type ProblemDetails
} from "./problem";

const inTrash: ProblemDetails = {
  type: "https://pm4.angelovski.top/errors/in-trash",
  title: "Not Found",
  status: 404,
  detail: "The project is in the trash."
};

function problemResponse(body: ProblemDetails): Response {
  return new Response(JSON.stringify(body), {
    status: body.status,
    headers: { "content-type": "application/problem+json" }
  });
}

/** Same mapping as PROJECT_FIELD_MAP in features/projects/schemas.ts (spec *Form*). */
const fieldMap = {
  title: "title",
  description: "description",
  externalLink: "externalLink",
  projectLeadUserId: "lead",
  projectLeadName: "lead"
} as const;

describe("unwrap / unwrapVoid (feat-prj-web)", () => {
  it("AC-1 API errors: 2xx → data; 404 in-trash → ApiError with slug and detail; 500 non-JSON → problem null; 204 → no throw", () => {
    expect(
      unwrap({
        data: { id: "p1" },
        response: new Response(null, { status: 200 })
      })
    ).toEqual({ id: "p1" });

    let caught: unknown;
    try {
      unwrap({ error: inTrash, response: problemResponse(inTrash) });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ApiError);
    const notFound = caught as ApiError;
    expect(notFound.status).toBe(404);
    expect(notFound.slug).toBe("in-trash");
    expect(notFound.problem?.detail).toBe("The project is in the trash.");

    caught = undefined;
    try {
      unwrap({
        error: "Internal Server Error",
        response: new Response("Internal Server Error", { status: 500 })
      });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).status).toBe(500);
    expect((caught as ApiError).problem).toBeNull();

    expect(() =>
      unwrapVoid({ response: new Response(null, { status: 204 }) })
    ).not.toThrow();
  });
});

describe("applyFieldErrors (feat-prj-web)", () => {
  it("AC-2 API errors: maps errors[] through the field map; a non-ApiError sets nothing", () => {
    const validation: ProblemDetails = {
      type: "https://pm4.angelovski.top/errors/validation",
      title: "Bad Request",
      status: 400,
      detail: "The request is invalid.",
      errors: [
        { field: "title", message: "title is too long" },
        { field: "projectLeadName", message: "projectLeadName is too long" },
        { field: "other", message: "unknown" }
      ]
    };
    const setError = vi.fn();
    expect(
      applyFieldErrors(new ApiError(400, validation), setError, fieldMap)
    ).toBe(true);
    const fields = setError.mock.calls.map((call) => call[0]);
    expect(fields).toContain("title");
    expect(fields).toContain("lead");
    expect(fields).not.toContain("other");

    const untouched = vi.fn();
    expect(applyFieldErrors(new Error("network"), untouched, fieldMap)).toBe(
      false
    );
    expect(untouched).not.toHaveBeenCalled();
  });
});
