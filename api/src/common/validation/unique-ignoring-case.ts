import {
  ValidatorConstraint,
  type ValidatorConstraintInterface
} from "class-validator";

/**
 * No two strings of the array equal ignoring case (`toLowerCase`). Non-arrays and
 * non-strings pass (other validators catch them).
 */
@ValidatorConstraint({ name: "uniqueIgnoringCase", async: false })
export class UniqueIgnoringCase implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (!Array.isArray(value)) return true;
    const seen = new Set<string>();
    for (const item of value) {
      if (typeof item !== "string") continue;
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
    }
    return true;
  }

  defaultMessage(): string {
    return "services must not repeat a name (ignoring case)";
  }
}
