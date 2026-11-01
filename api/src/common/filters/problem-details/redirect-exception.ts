import { HttpException } from "@nestjs/common";

/** A 302 to `url` instead of a Problem (the sign-in navigations, OQ-257). */
export class RedirectException extends HttpException {
  constructor(readonly url: string) {
    super("Redirect", 302);
  }
}
