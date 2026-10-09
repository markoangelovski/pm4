import {
  BadRequestException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { sanitizeTimeZone } from "../auth/auth.service.js";
import { MeResponseDto } from "./dto/me-response.dto.js";
import { UpdateMeDto } from "./dto/update-me.dto.js";
import { UserSearchResponseDto } from "./dto/user-search.dto.js";
import type { User } from "../database/schema/index.js";

import { UsersRepository } from "./users.repository.js";

const SEARCH_LIMIT = 10;

/** The `Me` shape of a user row. */
function toMe(user: User): MeResponseDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    timeZone: user.timeZone,
    dailyTargetMinutes: user.dailyTargetMinutes,
    createdAt: user.createdAt.toISOString()
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  /** The caller's profile; a token whose user no longer exists → `401`. */
  async getMe(userId: string): Promise<MeResponseDto> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException("Missing or invalid access token.");
    }
    return toMe(user);
  }

  /**
   * Changes the given settings (API-USR-002) and returns `Me`. A body without
   * fields changes nothing. A token whose user no longer exists → `401`.
   */
  async updateMe(userId: string, dto: UpdateMeDto): Promise<MeResponseDto> {
    const changes: { timeZone?: string; dailyTargetMinutes?: number } = {};
    if (dto.timeZone !== undefined) {
      // Canonical name, as sign-in stores it (D9); the DTO already rejected invalid names.
      const timeZone = sanitizeTimeZone(dto.timeZone);
      if (timeZone === null) {
        throw new BadRequestException(
          "timeZone must be a valid IANA time zone"
        );
      }
      changes.timeZone = timeZone;
    }
    if (dto.dailyTargetMinutes !== undefined) {
      changes.dailyTargetMinutes = dto.dailyTargetMinutes;
    }
    if (Object.keys(changes).length === 0) {
      return this.getMe(userId);
    }
    const user = await this.usersRepository.updateSettings(userId, changes);
    if (!user) {
      throw new UnauthorizedException("Missing or invalid access token.");
    }
    return toMe(user);
  }

  /** Users whose name or email contains `q`; the caller first (API-USR-003). */
  async search(callerId: string, q: string): Promise<UserSearchResponseDto> {
    return {
      items: await this.usersRepository.search(q, callerId, SEARCH_LIMIT)
    };
  }
}
