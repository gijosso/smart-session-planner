/**
 * Timezone utilities for handling session scheduling across different timezones
 *
 * Key Principles:
 * 1. Store all times in UTC in the database
 * 2. Convert to user's timezone for display/input
 * 3. Always use explicit timezone conversions (never rely on server timezone)
 * 4. Handle date boundaries carefully (what is "today" depends on timezone)
 *
 * NOTE: For production, consider using date-fns-tz library for more robust conversions:
 *   import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
 */

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
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // Format as YYYY-MM-DD in the target timezone
  const dateStr = formatter.format(date);

  // Create a date string representing midnight in the target timezone
  // We'll use a trick: create the date string and let JavaScript parse it
  // But we need to account for the timezone offset

  // Now we need to find what time in UTC equals midnight in the target timezone
  // We can do this by formatting midnightUTC in the target timezone and seeing the difference
  const formatterWithTime = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // Try different UTC times until we find one that represents midnight in target timezone
  // A simpler approach: use the fact that we can calculate the offset
  const testDate = new Date(`${dateStr}T12:00:00Z`); // Noon UTC
  const parts = formatterWithTime.formatToParts(testDate);
  const hourInTz = parseInt(
    parts.find((p) => p.type === "hour")?.value ?? "12",
  );

  // Calculate offset: if it's 12:00 UTC and 7:00 in target timezone (EST), offset is -5 hours
  const offsetHours = 12 - hourInTz;

  // Now create midnight in target timezone
  // Start with midnight UTC, then adjust by the offset
  const startOfDayUTC = new Date(`${dateStr}T00:00:00Z`);
  startOfDayUTC.setHours(startOfDayUTC.getHours() - offsetHours);

  // But wait, this doesn't account for DST properly. Let's use a better method:
  // Format the date to get what day it is in the target timezone, then work backwards
  const dateInTz = new Date(
    date.toLocaleString("en-US", { timeZone: timezone }),
  );

  // Now we need to convert this "local" date back to UTC, but accounting for the target timezone
  // The simplest reliable method: use Intl to format, then parse
  const year = dateInTz.getFullYear();
  const month = String(dateInTz.getMonth() + 1).padStart(2, "0");
  const day = String(dateInTz.getDate()).padStart(2, "0");

  // Create a date string for midnight in the target timezone
  // We'll create it as if it's UTC, then calculate the actual UTC time
  const dateString = `${year}-${month}-${day}T00:00:00`;

  // Use Intl to get the UTC time that corresponds to midnight in target timezone
  // We can do this by creating a date and using the timezone offset
  const tempDate = new Date(dateString);
  const utcTime = tempDate.getTime();
  const tzTime = new Date(
    tempDate.toLocaleString("en-US", { timeZone: timezone }),
  ).getTime();
  const offset = utcTime - tzTime;

  return new Date(utcTime - offset);
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
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);

  return {
    year: parseInt(parts.find((p) => p.type === "year")?.value ?? "0"),
    month: parseInt(parts.find((p) => p.type === "month")?.value ?? "0"),
    day: parseInt(parts.find((p) => p.type === "day")?.value ?? "0"),
    hours: parseInt(parts.find((p) => p.type === "hour")?.value ?? "0"),
    minutes: parseInt(parts.find((p) => p.type === "minute")?.value ?? "0"),
    seconds: parseInt(parts.find((p) => p.type === "second")?.value ?? "0"),
  };
}
