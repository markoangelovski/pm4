import { Injectable, UnauthorizedException } from "@nestjs/common";
import { MeResponseDto } from "./dto/me-response.dto.js";
import { UsersRepository } from "./users.repository.js";

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  /** The caller's profile; a token whose user no longer exists → `401`. */
  async getMe(userId: string): Promise<MeResponseDto> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException("Missing or invalid access token.");
    }
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      timeZone: user.timeZone,
      createdAt: user.createdAt.toISOString()
    };
  }
}
