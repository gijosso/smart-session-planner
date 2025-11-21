/**
 * Timezone utilities for handling session scheduling across different timezones
 *
 * Key Principles:
 * 1. Store all times in UTC in the database
 * 2. Convert to user's timezone for display/input
 * 3. Always use explicit timezone conversions (never rely on server timezone)
 * 4. Handle date boundaries carefully (what is "today" depends on timezone)
 *
 * Uses date-fns-tz for reliable timezone conversions that properly handle DST
 * and edge cases.
 */

import { fromZonedTime, toZonedTime } from "date-fns-tz";

/**
 * Get user's timezone, defaulting to UTC if not set
 */
export function getUserTimezone(
  userTimezone: string | null | undefined,
): string {
  return userTimezone ?? "UTC";
}

/**
 * Get the start of a day in a specific timezone, returned as UTC Date
 *
 * This calculates what "midnight" is in the user's timezone, then returns
 * the UTC equivalent. This is useful for date boundary queries.
 *
 * @param date - Reference date (can be in any timezone)
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 * @returns Date object representing start of day in UTC
 *
 * Example:
 *   User in New York on Nov 17, 2024
 *   Start of day = Nov 17, 2024 00:00:00 EST = Nov 17, 2024 05:00:00 UTC
 */
export function getStartOfDayInTimezone(date: Date, timezone: string): Date {
  // Get the date components in the target timezone
  const zonedDate = toZonedTime(date, timezone);

  // Create midnight in the target timezone (local time)
  const startOfDayLocal = new Date(
    zonedDate.getFullYear(),
    zonedDate.getMonth(),
    zonedDate.getDate(),
    0,
    0,
    0,
    0,
  );

  // Convert back to UTC
  // fromZonedTime converts a date representing a local time in the given timezone to UTC
  return fromZonedTime(startOfDayLocal, timezone);
}

/**
 * Get the end of a day in a specific timezone (start of next day)
 * @param date - Reference date
 * @param timezone - IANA timezone string
 * @returns Date object representing start of next day in UTC
 */
export function getEndOfDayInTimezone(date: Date, timezone: string): Date {
  const startOfDay = getStartOfDayInTimezone(date, timezone);
  // Add 24 hours to get start of next day
  return new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
}

/**
 * Format a date for display in a specific timezone
 * Returns formatted strings - actual conversion should be done on frontend
 *
 * This is a helper for getting date components, but the frontend should
 * handle the actual display formatting using Intl.DateTimeFormat
 */
export function getDateComponentsInTimezone(
  date: Date,
  timezone: string,
): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  // Convert UTC date to zoned time
  const zonedDate = toZonedTime(date, timezone);

  return {
    year: zonedDate.getFullYear(),
    month: zonedDate.getMonth() + 1, // getMonth() returns 0-11
    day: zonedDate.getDate(),
    hours: zonedDate.getHours(),
    minutes: zonedDate.getMinutes(),
    seconds: zonedDate.getSeconds(),
  };
}
