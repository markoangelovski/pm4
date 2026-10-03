/** Escapes `\`, `%` and `_` for a Postgres LIKE/ILIKE pattern (default escape char `\`). */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
