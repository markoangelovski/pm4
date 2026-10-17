/* eslint-disable @typescript-eslint/no-unused-vars -- typed stub from the test step; T2 implements the bodies */
import { Injectable } from "@nestjs/common";
import { AppConfigService } from "../../config/app-config.service.js";

/**
 * Encrypts the PMSPA password and token at rest (FR-INT-003) under
 * `PMSPA_ENCRYPTION_KEY`: AES-256-GCM, `randomBytes(12)` IV ‖ ciphertext ‖
 * 16-byte tag.
 */
@Injectable()
export class PmspaCrypto {
  constructor(private readonly config: AppConfigService) {}

  encrypt(plain: string): Buffer {
    throw new Error("not implemented (feat-int-conn-api)");
  }

  /** Throws on a wrong key or a changed blob. */
  decrypt(blob: Buffer): string {
    throw new Error("not implemented (feat-int-conn-api)");
  }
}
