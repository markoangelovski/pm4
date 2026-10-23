/** As web/lib/time: "3h 45m", "45m", "2h". */
export function formatDuration(minutes: number): string {
  const total = Math.abs(Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
