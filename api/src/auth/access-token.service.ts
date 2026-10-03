import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

interface AccessTokenPayload {
  sub: string;
  iat: number;
  exp: number;
}

/**
 * Access tokens (endpoints.md *Shared auth shapes*): HS256 JWTs signed with
 * `JWT_ACCESS_SECRET`, claims `sub` (user id), `iat`, `exp`. A thin wrapper
 * over `JwtService`, whose secret, algorithm and TTL come from `AuthModule`.
 */
@Injectable()
export class AccessTokenService {
  constructor(private readonly jwtService: JwtService) {}

  async sign(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const token = await this.jwtService.signAsync({ sub: userId });
    const { exp } = this.jwtService.decode<AccessTokenPayload>(token);
    return { token, expiresAt: new Date(exp * 1000) };
  }

  /**
   * The token's user id, or `null` if the token is malformed, badly signed,
   * not HS256 (e.g. `alg: none`), expired or has no `sub`.
   */
  async verify(token: string): Promise<string | null> {
    try {
      const payload =
        await this.jwtService.verifyAsync<Partial<AccessTokenPayload>>(token);
      return typeof payload.sub === "string" && payload.sub.length > 0
        ? payload.sub
        : null;
    } catch {
      return null;
    }
  }
}
