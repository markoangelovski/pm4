import { Inject, Injectable } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import type { GoogleProfile } from "../auth/google-oidc.js";
import { DRIZZLE, type DrizzleDb } from "../database/drizzle.js";
import { User, userIdentities, users } from "../database/schema/index.js";

const DISPLAY_NAME_MAX = 100;
const AVATAR_URL_MAX = 500;

/** Google `name` trimmed and cut to 100 chars; empty → the email's local part (D12). */
export function displayNameFrom(profile: GoogleProfile): string {
  const name = (profile.name ?? "").trim().slice(0, DISPLAY_NAME_MAX).trim();
  if (name.length > 0) return name;
  const at = profile.email.lastIndexOf("@");
  const localPart = at > 0 ? profile.email.slice(0, at) : profile.email;
  return localPart.slice(0, DISPLAY_NAME_MAX);
}

/** Google `picture` only if it is `https://` and ≤ 500 chars, else `null` (D12). */
export function avatarUrlFrom(profile: GoogleProfile): string | null {
  const picture = profile.picture;
  return picture &&
    picture.startsWith("https://") &&
    picture.length <= AVATAR_URL_MAX
    ? picture
    : null;
}

/** Data access for `users` and `user_identities`. */
@Injectable()
export class UsersRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async findById(id: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user ?? null;
  }

  /**
   * Signs in a Google identity (FR-AUTH-002, D4, D12), in one transaction:
   * a known identity syncs its user's email, name and avatar (only when one
   * differs; `time_zone` never changes), a new one creates the user with
   * `timeZone` and the identity. A unique violation on the email propagates.
   */
  async upsertFromGoogle(
    profile: GoogleProfile,
    timeZone: string
  ): Promise<{ id: string; email: string }> {
    const email = profile.email;
    const displayName = displayNameFrom(profile);
    const avatarUrl = avatarUrlFrom(profile);

    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl
        })
        .from(userIdentities)
        .innerJoin(users, eq(users.id, userIdentities.userId))
        .where(
          and(
            eq(userIdentities.provider, "google"),
            eq(userIdentities.subject, profile.subject)
          )
        )
        .limit(1);

      if (existing) {
        const changed =
          existing.email !== email ||
          existing.displayName !== displayName ||
          existing.avatarUrl !== avatarUrl;
        if (changed) {
          await tx
            .update(users)
            .set({ email, displayName, avatarUrl, updatedAt: sql`now()` })
            .where(eq(users.id, existing.id));
        }
        return { id: existing.id, email };
      }

      const [created] = await tx
        .insert(users)
        .values({ email, displayName, avatarUrl, timeZone })
        .returning({ id: users.id, email: users.email });
      await tx.insert(userIdentities).values({
        provider: "google",
        subject: profile.subject,
        userId: created.id
      });
      return created;
    });
  }
}
