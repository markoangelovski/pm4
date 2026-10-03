import { z } from "zod";

/**
 * Validates a value is a syntactically valid URL using one of the given
 * protocols (e.g. `postgres:`, `redis:`, `https:`). Node's `URL` parser
 * understands non-HTTP schemes such as `postgres://` and `rediss://`,
 * which `z.string().url()` alone does not reliably validate across schemes.
 */
function urlWithProtocol(protocols: string[]) {
  return z
    .string()
    .min(1)
    .refine(
      (value) => {
        try {
          const url = new URL(value);
          return protocols.includes(url.protocol.replace(/:$/, ""));
        } catch {
          return false;
        }
      },
      {
        message: `must be a URL with one of these protocols: ${protocols.join(", ")}`
      }
    );
}

const DURATION_UNIT_SECONDS = { s: 1, m: 60, h: 3600, d: 86400 } as const;

/**
 * A duration like `15m` or `30d` (a positive integer and one of `s`, `m`,
 * `h`, `d`), transformed to whole seconds.
 */
const duration = z
  .string()
  .regex(/^[1-9]\d*[smhd]$/, "must look like 15m or 30d")
  .transform((value) => {
    const unit = value.slice(-1) as keyof typeof DURATION_UNIT_SECONDS;
    return Number(value.slice(0, -1)) * DURATION_UNIT_SECONDS[unit];
  });

/**
 * Env vars validated at boot for T-0001. Every other variable listed in
 * specs/02-architecture/environments.md goes into `.env.example` now, and is
 * added to this schema by the task that first uses it (auth → M1).
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: urlWithProtocol(["postgres", "postgresql"]),
  REDIS_URL: urlWithProtocol(["redis", "rediss"]),
  CORS_ORIGINS: z
    .string()
    .min(1, "CORS_ORIGINS must not be empty")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0)
    )
    .pipe(z.array(urlWithProtocol(["http", "https"])).min(1)),
  WEB_APP_URL: urlWithProtocol(["http", "https"]),
  // Auth (feat-auth-api-session). `.prefault` (not `.default`) so the
  // default goes through the transform (zod 4).
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: urlWithProtocol(["http", "https"]),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  ACCESS_TOKEN_TTL: duration.prefault("15m"),
  REFRESH_TOKEN_TTL: duration.prefault("30d"),
  AUTH_ALLOWED_EMAILS: z
    .string()
    .prefault("")
    .transform((value) =>
      value
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter((email) => email.length > 0)
    )
});

export type Env = z.infer<typeof envSchema>;

/**
 * Passed as `validate` to `@nestjs/config`'s `ConfigModule.forRoot`. Throws a
 * single, readable error listing every invalid/missing variable so the app
 * fails fast at boot instead of later, at first use.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues
      .map(
        (issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`
      )
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}
