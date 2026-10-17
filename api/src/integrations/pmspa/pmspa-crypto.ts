import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { AppConfigService } from "../../config/app-config.service.js";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

/**
 * Encrypts the PMSPA password and token at rest (FR-INT-003) under
 * `PMSPA_ENCRYPTION_KEY`: AES-256-GCM, `randomBytes(12)` IV ‖ ciphertext ‖
 * 16-byte tag.
 */
@Injectable()
export class PmspaCrypto {
  constructor(private readonly config: AppConfigService) {}

  encrypt(plain: string): Buffer {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(
      ALGORITHM,
      this.config.pmspaEncryptionKey,
      iv
    );
    const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    return Buffer.concat([iv, body, cipher.getAuthTag()]);
  }

  /** Throws on a wrong key or a changed blob. */
  decrypt(blob: Buffer): string {
    if (blob.length < IV_BYTES + TAG_BYTES) {
      throw new Error("PMSPA ciphertext is too short");
    }
    const iv = blob.subarray(0, IV_BYTES);
    const tag = blob.subarray(blob.length - TAG_BYTES);
    const body = blob.subarray(IV_BYTES, blob.length - TAG_BYTES);
    const decipher = createDecipheriv(
      ALGORITHM,
      this.config.pmspaEncryptionKey,
      iv
    );
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(body), decipher.final()]).toString(
      "utf8"
    );
  }
}
