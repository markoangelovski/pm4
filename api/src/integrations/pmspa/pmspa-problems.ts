import { ProblemException } from "../../common/filters/problem-details/problem-exception.js";

/** One factory per row of endpoints.md *PMSPA errors*, plus the account switch. */
export const pmspaProblems = {
  notConnected: () =>
    new ProblemException(
      409,
      "pmspa-not-connected",
      "PMSPA isn't connected",
      "Connect PMSPA in Settings → Integrations."
    ),
  invalidCredentials: () =>
    new ProblemException(
      409,
      "pmspa-invalid-credentials",
      "PMSPA rejected the credentials",
      "PMSPA rejected the saved email or password."
    ),
  unreachable: () =>
    new ProblemException(
      502,
      "pmspa-unreachable",
      "PMSPA is unreachable",
      "PMSPA couldn't be reached or didn't answer in time."
    ),
  error: () =>
    new ProblemException(
      502,
      "pmspa-error",
      "PMSPA failed",
      "PMSPA answered with an error."
    ),
  rateLimited: (retryAfterSeconds: number) =>
    new ProblemException(
      503,
      "pmspa-rate-limited",
      "PMSPA is busy",
      "PMSPA is busy. Try again later.",
      { retryAfterSeconds }
    ),
  syncRunning: () =>
    new ProblemException(
      409,
      "pmspa-sync-running",
      "A sync is running",
      "Another import, sync or push is still running."
    ),
  accountSwitch: (linkCount: number, accountEmail: string) =>
    new ProblemException(
      409,
      "pmspa-account-switch",
      "Different PMSPA account",
      "The credentials log in as a different PMSPA account.",
      { linkCount, accountEmail }
    )
};
