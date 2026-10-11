export type DurationParse =
  { ok: true; minutes: number } | { ok: false; error: string };

const STEP_ERROR = "Use 15-minute steps, from 15 min to 24 h.";

/** FR-TLOG-010: "0.25", "1,5", "1", "45", "1h", "1h 15m", "45m", "1:15" → minutes in 15-minute steps. */
export function parseDurationInput(value: string): DurationParse {
  const text = value.trim().toLowerCase();
  if (!text) return { ok: false, error: "Enter a duration." };

  let minutes: number | null = null;
  let m: RegExpMatchArray | null;
  if ((m = text.match(/^(\d+)[.,](\d+)$/))) {
    minutes = Number(`${m[1]}.${m[2]}`) * 60;
  } else if ((m = text.match(/^(\d+)$/))) {
    const n = Number(m[1]);
    minutes = n < 15 ? n * 60 : n;
  } else if ((m = text.match(/^(\d+):(\d{2})$/))) {
    minutes = Number(m[1]) * 60 + Number(m[2]);
  } else if (
    (m = text.match(/^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?$/)) &&
    (m[1] || m[2])
  ) {
    minutes = Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0);
  }

  if (
    minutes === null ||
    !Number.isFinite(minutes) ||
    minutes < 15 ||
    minutes > 1440 ||
    Math.abs(minutes / 15 - Math.round(minutes / 15)) > 1e-9
  ) {
    return { ok: false, error: STEP_ERROR };
  }
  return { ok: true, minutes: Math.round(minutes) };
}
