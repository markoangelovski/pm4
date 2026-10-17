import type { AppConfigService } from "../../config/app-config.service.js";
import { PmspaCrypto } from "./pmspa-crypto.js";

describe("PmspaCrypto (feat-int-conn-api)", () => {
  const crypto = new PmspaCrypto({
    pmspaEncryptionKey: Buffer.alloc(32, 7)
  } as unknown as AppConfigService);

  it("AC-15 FR-INT-003: decrypt(encrypt(s)) returns s", () => {
    for (const plain of ["secret", "", "pässwörd with spaces ✓"]) {
      expect(crypto.decrypt(crypto.encrypt(plain))).toBe(plain);
    }
  });

  it("AC-15 FR-INT-003: two encryptions of the same text differ", () => {
    const first = crypto.encrypt("secret");
    const second = crypto.encrypt("secret");
    expect(first.equals(second)).toBe(false);
  });

  it("AC-15 FR-INT-003: a flipped byte makes decrypt throw", () => {
    const blob = crypto.encrypt("secret");
    for (const index of [0, 12, blob.length - 1]) {
      const changed = Buffer.from(blob);
      changed[index] ^= 0x01;
      expect(() => crypto.decrypt(changed)).toThrow();
    }
  });
});
