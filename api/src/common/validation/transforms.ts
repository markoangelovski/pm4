import { Transform } from "class-transformer";

/** Trims a string input (conventions.md *Requests*, D12); other values pass through. */
export const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value
  );

/** Trims a string input; empty after trimming → `null` (optional text fields, D12). */
export const TrimToNull = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() || null : value
  );

/** Trims each string of an array input; other values pass through. */
export const TrimEach = () =>
  Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((v: unknown) => (typeof v === "string" ? v.trim() : v))
      : value
  );
