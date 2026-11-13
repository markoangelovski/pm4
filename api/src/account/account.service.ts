import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { SessionStore } from "../auth/session.store.js";
import { PmspaStore } from "../integrations/pmspa/pmspa-store.js";
import { UsersRepository } from "../users/users.repository.js";

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly sessions: SessionStore,
    private readonly pmspaStore: PmspaStore
  ) {}

  /** API-USR-004: the account, then its sessions and cached PMSPA data (D3). */
  async deleteAccount(userId: string): Promise<void> {
    if (!(await this.usersRepository.deleteAccount(userId))) {
      throw new UnauthorizedException("Missing or invalid access token.");
    }
    // Each cleanup on its own, so one Redis failure doesn't skip the other (D3).
    await this.cleanUp(userId, "sessions", () =>
      this.sessions.revokeAll(userId)
    );
    await this.cleanUp(userId, "PMSPA data", () =>
      this.pmspaStore.clear(userId)
    );
  }

  private async cleanUp(
    userId: string,
    what: string,
    run: () => Promise<unknown>
  ): Promise<void> {
    try {
      await run();
    } catch (error) {
      this.logger.warn(
        `Account ${userId} deleted, but clearing its ${what} failed: ${String(error)}`
      );
    }
  }
}
