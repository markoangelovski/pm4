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
  WEB_APP_URL: urlWithProtocol(["http", "https"])
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
