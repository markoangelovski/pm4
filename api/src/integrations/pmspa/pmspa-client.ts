/* eslint-disable @typescript-eslint/no-unused-vars -- typed stub from the test step (OQ-183); T4 implements it */
import { Injectable } from "@nestjs/common";
import type { PmspaRequest, PmspaResponse } from "./pmspa-transport.js";

/**
 * The one PMSPA client every connector endpoint goes through. T4 adds the
 * constructor and `check`.
 */
@Injectable()
export class PmspaClient {
  /** An authenticated call for the user's saved connection (FR-INT-003). */
  request(
    userId: string,
    req: Omit<PmspaRequest, "baseUrl" | "token">
  ): Promise<PmspaResponse> {
    throw new Error("not implemented (feat-int-conn-api)");
  }
}
