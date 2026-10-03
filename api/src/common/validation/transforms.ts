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
