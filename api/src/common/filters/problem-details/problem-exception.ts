import { HttpException } from "@nestjs/common";

/**
 * Extension members never redefine the standard ones (RFC 9457): the reserved
 * keys are typed `never`, so a `ProblemException` cannot carry them.
 */
export type ProblemExtensions = Record<string, unknown> & {
  type?: never;
  title?: never;
  status?: never;
  detail?: never;
  instance?: never;
  errors?: never;
};

/**
 * An HTTP error with its own RFC 9457 slug, title and extension members
 * (`type` = `<WEB_APP_URL>/errors/<slug>`). `detail` is the exception message
 * and is shown to the user, also for 5xx statuses (`ProblemDetailsFilter`).
 * Use it for errors that need a slug of their own, e.g. `pmspa-*` (D2).
 */
export class ProblemException extends HttpException {
  constructor(
    status: number,
    readonly slug: string,
    readonly title: string,
    detail: string,
    readonly extensions: ProblemExtensions = {}
  ) {
    super(detail, status);
  }
}
