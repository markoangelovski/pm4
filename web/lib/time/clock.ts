import { TZDate } from "@date-fns/tz";

const pad = (n: number) => String(n).padStart(2, "0");

/** Minutes since midnight as `HH:mm`; past midnight: 1530 → "01:30 (+1 day)". */
export function formatClock(minute: number): string {
  const day = Math.floor(minute / 1440);
  const m = minute - day * 1440;
  const text = `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  return day > 0 ? `${text} (+${day} day${day > 1 ? "s" : ""})` : text;
}

/** Nearest quarter hour, capped at 23:45 (1425). */
export function roundToQuarter(minute: number): number {
  return Math.min(1425, Math.round(minute / 15) * 15);
}

/** Minutes since midnight right now in `tz`. */
export function nowMinute(tz: string): number {
  const now = new TZDate(new Date(), tz);
  return now.getHours() * 60 + now.getMinutes();
}
