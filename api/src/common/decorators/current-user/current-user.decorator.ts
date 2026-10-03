import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

/** The authenticated caller, set on the request by `AccessTokenGuard`. */
export interface AuthUser {
  id: string;
}

/** Injects the authenticated caller (`request.user`) into a handler. */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<Request & { user: AuthUser }>().user
);
