import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common";
import type { Response } from "express";

export type OAuthErrorCode =
  | "invalid_request"
  | "invalid_client"
  | "invalid_grant"
  | "unsupported_grant_type"
  | "invalid_scope"
  | "invalid_target"
  | "invalid_redirect_uri"
  | "invalid_client_metadata";

/** An OAuth error answered as `{error, error_description?}` (RFC 6749 §5.2, RFC 7591 §3.2.2). */
export class OAuthError extends Error {
  constructor(
    readonly error: OAuthErrorCode,
    readonly description?: string,
    readonly status = 400
  ) {
    super(error);
  }
}

/** Status, `Cache-Control: no-store`, JSON body. Other exceptions go to the global filter. */
@Catch(OAuthError)
export class OAuthErrorFilter implements ExceptionFilter {
  catch(exception: OAuthError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const body: { error: string; error_description?: string } = {
      error: exception.error
    };
    if (exception.description) body.error_description = exception.description;
    response
      .status(exception.status)
      .setHeader("Cache-Control", "no-store")
      .json(body);
  }
}
