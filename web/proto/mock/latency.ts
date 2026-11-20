// The prototype shell's "slow API" switch: every mock API response waits longer, so loading states and the
// top progress bar can be judged. Module state, reset on reload like the rest of the mock.

let slowMs = 0;

/** Adds `ms` to every mock response's delay; 0 turns it off. */
export function setMockSlowness(ms: number): void {
  slowMs = ms;
}

/** The extra delay the switch currently adds. */
export function mockSlowness(): number {
  return slowMs;
}
