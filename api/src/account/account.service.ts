import { Injectable } from "@nestjs/common";

@Injectable()
export class AccountService {
  /** API-USR-004: the account, then its sessions and cached PMSPA data (D3). */
  deleteAccount(userId: string): Promise<void> {
    void userId;
    throw new Error("not implemented (feat-acct-api)");
  }
}
