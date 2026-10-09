import {
  ValidatorConstraint,
  type ValidatorConstraintInterface
} from "class-validator";
import { sanitizeTimeZone } from "../../auth/auth.service.js";

/** An integer that is a multiple of 15 minutes (API-USR-002, API-TLOG-002). */
@ValidatorConstraint({ name: "multipleOf15", async: false })
export class MultipleOf15 implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return (
      typeof value === "number" && Number.isInteger(value) && value % 15 === 0
    );
  }

  defaultMessage(): string {
    return "must be a multiple of 15";
  }
}

/**
 * An IANA time zone name, accepted exactly as sign-in accepts one (API-USR-002,
 * D9): `sanitizeTimeZone` must not return `null`. A fixed offset such as `+01:00` is rejected.
 */
@ValidatorConstraint({ name: "ianaTimeZone", async: false })
export class IanaTimeZone implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return sanitizeTimeZone(value) !== null;
  }

  defaultMessage(): string {
    return "must be a valid IANA time zone";
  }
}
