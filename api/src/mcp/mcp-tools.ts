import { HttpException, Logger, UnauthorizedException } from "@nestjs/common";
import type { AuthInfo, CallToolResult } from "@modelcontextprotocol/server";
import type { UsersRepository } from "../users/users.repository.js";
import { todayIn } from "../time/time-logs.service.js";

/** What AccessTokenGuard puts on `request.auth` for /mcp. */
export interface McpAuthInfo extends AuthInfo {
  extra: { userId: string; grantId: string };
}

export function jsonResult(value: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(value) }] };
}

export function errorResult(text: string): CallToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

function messageOf(err: HttpException): string {
  const response = err.getResponse();
  if (
    err.getStatus() === 400 &&
    typeof response === "object" &&
    Array.isArray((response as { errors?: unknown }).errors)
  ) {
    const errors = (
      response as { errors: { field: string; message: string }[] }
    ).errors;
    return (
      "Invalid input:\n" +
      errors.map((e) => `- ${e.field}: ${e.message}`).join("\n")
    );
  }
  return err.message;
}

/** Runs a tool body: its value → JSON; a 4xx HttpException → an error result; anything else → logged, generic. */
export async function runTool(
  logger: Logger,
  body: () => Promise<unknown>
): Promise<CallToolResult> {
  try {
    return jsonResult(await body());
  } catch (err) {
    if (
      err instanceof HttpException &&
      err.getStatus() >= 400 &&
      err.getStatus() < 500
    ) {
      return errorResult(messageOf(err));
    }
    logger.error(err);
    return errorResult("Something went wrong. Try again later.");
  }
}

/** Today in the user's time zone; no user → 401. */
export async function userToday(
  users: UsersRepository,
  userId: string
): Promise<string> {
  const user = await users.findById(userId);
  if (!user) throw new UnauthorizedException();
  return todayIn(user.timeZone);
}

/** Drops the keys whose value is `undefined`, so absent optional tool inputs reach `validateDto` as absent. */
export function present(
  values: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined)
  );
}
