import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { AppConfigService } from "../../config/app-config.service.js";
import type { PmspaConnectionResponseDto } from "./dto/pmspa-connection-response.dto.js";
import type { SavePmspaConnectionDto } from "./dto/save-pmspa-connection.dto.js";
import { PmspaClient } from "./pmspa-client.js";
import {
  PmspaConnectionRepository,
  type PmspaConnectionRow,
  type PmspaStatus
} from "./pmspa-connection.repository.js";
import { PmspaCrypto } from "./pmspa-crypto.js";
import { PmspaHostGuard } from "./pmspa-host-guard.js";
import { pmspaProblems } from "./pmspa-problems.js";
import { PmspaStore } from "./pmspa-store.js";
import { PMSPA_URL_MESSAGES, pmspaUrlProblem } from "./pmspa-url-policy.js";

/** A 400 naming one field (the validation shape of conventions.md#errors). */
function fieldError(field: string, message: string): BadRequestException {
  return new BadRequestException({ errors: [{ field, message }] });
}

function notConfigured(): PmspaConnectionResponseDto {
  return {
    status: "not-configured",
    url: null,
    email: null,
    account: null,
    lastCheckedAt: null,
    lastSyncAt: null,
    rateLimit: null
  };
}

/** The PMSPA connection of the caller (API-INT-001…004, FR-INT-001…005). */
@Injectable()
export class PmspaConnectionService {
  constructor(
    private readonly repo: PmspaConnectionRepository,
    private readonly crypto: PmspaCrypto,
    private readonly client: PmspaClient,
    private readonly store: PmspaStore,
    private readonly guard: PmspaHostGuard,
    private readonly config: AppConfigService
  ) {}

  /** Reads the stored row; no PMSPA call (API-INT-001). */
  async get(userId: string): Promise<PmspaConnectionResponseDto> {
    const row = await this.repo.find(userId);
    if (!row) return notConfigured();
    return this.toDto(userId, row);
  }

  /** Saves, then checks; stores the settings whatever the result (API-INT-002). */
  async save(
    userId: string,
    dto: SavePmspaConnectionDto
  ): Promise<PmspaConnectionResponseDto> {
    const problem = pmspaUrlProblem(dto.url, this.config.nodeEnv);
    if (problem) throw fieldError("url", PMSPA_URL_MESSAGES[problem]);

    const row = await this.repo.find(userId);
    const password = dto.password ?? (row ? this.stored(row) : undefined);
    if (password === undefined) {
      throw fieldError("password", "Enter the password.");
    }
    if ((await this.guard.check(dto.url)) === "private") {
      throw fieldError("url", PMSPA_URL_MESSAGES.private);
    }

    const check = await this.client.check(dto.url, dto.email, password);
    const connected = check.status === "connected" ? check : null;
    // The previous account is the row's; without one, a switch is any link of another account.
    const values = this.values(
      userId,
      dto,
      password,
      check.status,
      connected ? connected.account.id : (row?.pmspaUserId ?? null)
    );

    if (connected && row?.pmspaUserId !== connected.account.id) {
      const count = await this.repo.countOtherAccountLinks(
        userId,
        connected.account.id
      );
      if (count > 0) {
        if (!dto.confirmAccountSwitch) {
          throw pmspaProblems.accountSwitch(count, connected.account.email);
        }
        await this.repo.switchAccount(values);
      } else {
        await this.repo.upsert(values);
      }
    } else {
      await this.repo.upsert(values);
    }

    if (connected) {
      await this.store.setToken(userId, connected.token);
      await this.store.setAccount(userId, connected.account);
    } else {
      await this.store.clear(userId);
    }
    return this.get(userId);
  }

  /** Checks the stored credentials again and writes the status (API-INT-003). */
  async test(userId: string): Promise<PmspaConnectionResponseDto> {
    const row = await this.repo.find(userId);
    if (!row) throw new NotFoundException();

    const password = this.stored(row);
    if (password === undefined) {
      // OQ-187: a password that no longer decrypts is invalid credentials; no PMSPA call.
      await this.repo.setStatus(userId, "invalid-credentials");
      await this.store.clear(userId);
      return this.get(userId);
    }

    const check = await this.client.check(row.url, row.email, password);
    if (check.status !== "connected") {
      await this.repo.setStatus(userId, check.status);
      await this.store.clear(userId);
    } else if (
      row.pmspaUserId !== null &&
      check.account.id !== row.pmspaUserId
    ) {
      // D8: another account than the saved one needs Save and its confirmation.
      await this.repo.setStatus(userId, "invalid-credentials");
      await this.store.clear(userId);
    } else {
      await this.repo.setStatus(userId, "connected", check.account.id);
      await this.store.setToken(userId, check.token);
      await this.store.setAccount(userId, check.account);
    }
    return this.get(userId);
  }

  /** Deletes the connection and the cached token; the links stay (API-INT-004). */
  async disconnect(userId: string): Promise<void> {
    await this.repo.delete(userId);
    await this.store.clear(userId);
  }

  /** The stored password, or undefined when it no longer decrypts (OQ-187). */
  private stored(row: PmspaConnectionRow): string | undefined {
    try {
      return this.crypto.decrypt(row.passwordEnc);
    } catch {
      return undefined;
    }
  }

  private values(
    userId: string,
    dto: SavePmspaConnectionDto,
    password: string,
    status: PmspaStatus,
    pmspaUserId: string | null
  ): Omit<PmspaConnectionRow, "lastSyncAt"> {
    return {
      userId,
      url: dto.url,
      email: dto.email,
      passwordEnc: this.crypto.encrypt(password),
      status,
      pmspaUserId,
      lastCheckedAt: new Date()
    };
  }

  private async toDto(
    userId: string,
    row: PmspaConnectionRow
  ): Promise<PmspaConnectionResponseDto> {
    const account =
      row.status === "connected" ? await this.store.getAccount(userId) : null;
    return {
      status: row.status,
      url: row.url,
      email: row.email,
      account,
      lastCheckedAt: row.lastCheckedAt.toISOString(),
      lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
      rateLimit: await this.rateLimitOf(row.url)
    };
  }

  /** The host's last PMSPA rate-limit answer (OQ-200); null when the URL doesn't parse. */
  private async rateLimitOf(url: string) {
    let host: string;
    try {
      host = new URL(url).host.toLowerCase();
    } catch {
      return null;
    }
    return this.store.getRateLimit(host);
  }
}
