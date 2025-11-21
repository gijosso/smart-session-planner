/**
 * Type guard utilities for safe type checking
 * Prevents unsafe type assertions by validating types at runtime
 */

import type { DayOfWeek, SessionType } from "@ssp/api/client";
import { DAYS_OF_WEEK } from "@ssp/api/client";

import { SESSION_TYPES_DISPLAY } from "~/constants/session";

/**
 * Type guard to check if a string is a valid DayOfWeek
 */
export function isValidDayOfWeek(day: string): day is DayOfWeek {
  return DAYS_OF_WEEK.includes(day as DayOfWeek);
}

/**
 * Type guard to check if a string is a valid SessionType
 */
export function isValidSessionType(type: string): type is SessionType {
  return Object.values(SESSION_TYPES_DISPLAY).some(
    (t) => t.value === type,
  );
}

/**
 * Safely convert a string to DayOfWeek, returning undefined if invalid
 */
export function toDayOfWeek(day: string): DayOfWeek | undefined {
  return isValidDayOfWeek(day) ? day : undefined;
}

/**
 * Safely convert a string to SessionType, returning undefined if invalid
 */
export function toSessionType(type: string): SessionType | undefined {
  return isValidSessionType(type) ? type : undefined;
}

