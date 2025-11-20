import type { DayOfWeek } from "@ssp/db/schema";

/**
 * Convert time string (HH:MM:SS) to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

/**
 * Convert minutes since midnight to time string (HH:MM:SS)
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:00`;
}

/**
 * Convert day of week string to number (0 = Sunday, 6 = Saturday)
 */
export function dayOfWeekToNumber(day: DayOfWeek): number {
  const map: Record<DayOfWeek, number> = {
    SUNDAY: 0,
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
  };
  return map[day];
}

/**
 * Get the date for a specific day of week relative to a start date
 * Returns the next occurrence of the target day of week in the given timezone
 */
export function getDateForDayOfWeek(
  startDate: Date,
  targetDayOfWeek: DayOfWeek,
  timezone: string,
): Date {
  const startDay = new Date(startDate);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
  });
  const currentDayName = formatter.format(startDay);
  const currentDayNum = dayOfWeekToNumber(
    currentDayName.toUpperCase() as DayOfWeek,
  );

  const targetDayNum = dayOfWeekToNumber(targetDayOfWeek);
  let daysToAdd = targetDayNum - currentDayNum;
  if (daysToAdd < 0) {
    daysToAdd += 7; // Next week
  }
  if (daysToAdd === 0 && startDate > new Date()) {
    // If today and we're past the time, move to next week
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    if (startDate < startOfToday) {
      daysToAdd = 7;
    }
  }

  const targetDate = new Date(startDate);
  targetDate.setDate(targetDate.getDate() + daysToAdd);
  return targetDate;
}

/**
 * Convert a local time (in a specific timezone) to UTC Date
 */
export function convertLocalTimeToUTC(
  date: Date,
  hours: number,
  minutes: number,
  timezone: string,
): Date {
  // Get date string in target timezone (YYYY-MM-DD format)
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dateStr = dateFormatter.format(date);

  // Create time string HH:MM:00
  const hoursStr = String(hours).padStart(2, "0");
  const minutesStr = String(minutes).padStart(2, "0");

  // Create a date representing this local time, then convert to UTC
  // Strategy: Create date as if it's UTC, then calculate offset and adjust
  const localTimeString = `${dateStr}T${hoursStr}:${minutesStr}:00`;
  const tempDate = new Date(`${localTimeString}Z`); // Parse as UTC

  // Get what this UTC time represents in the target timezone
  const tzFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const tzParts = tzFormatter.formatToParts(tempDate);
  const tzHour = Number.parseInt(
    tzParts.find((p) => p.type === "hour")?.value ?? "0",
    10,
  );
  const tzMinute = Number.parseInt(
    tzParts.find((p) => p.type === "minute")?.value ?? "0",
    10,
  );

  // Calculate offset: how much to adjust UTC to get the desired local time
  const offsetMinutes = (hours - tzHour) * 60 + (minutes - tzMinute);

  // Create the final UTC date
  const utcDate = new Date(tempDate);
  utcDate.setUTCMinutes(utcDate.getUTCMinutes() + offsetMinutes);
  return utcDate;
}

/**
 * Check if two time ranges overlap (time strings in HH:MM:SS format)
 */
export function timeRangesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string,
): boolean {
  const start1Min = timeToMinutes(start1);
  const end1Min = timeToMinutes(end1);
  const start2Min = timeToMinutes(start2);
  const end2Min = timeToMinutes(end2);

  // Check if ranges overlap (including touching at boundaries)
  return start1Min <= end2Min && start2Min <= end1Min;
}

/**
 * Merge two overlapping time ranges (time strings in HH:MM:SS format)
 */
export function mergeTimeRanges(
  start1: string,
  end1: string,
  start2: string,
  end2: string,
): { start: string; end: string } {
  const start1Min = timeToMinutes(start1);
  const end1Min = timeToMinutes(end1);
  const start2Min = timeToMinutes(start2);
  const end2Min = timeToMinutes(end2);

  const mergedStart = Math.min(start1Min, start2Min);
  const mergedEnd = Math.max(end1Min, end2Min);

  return {
    start: minutesToTime(mergedStart),
    end: minutesToTime(mergedEnd),
  };
}

/**
 * Check if two Date ranges overlap
 */
export function dateRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date,
): boolean {
  // Two ranges overlap if start1 < end2 AND start2 < end1
  return start1 < end2 && start2 < end1;
}

/**
 * Calculate hours between two dates
 */
export function hoursBetween(date1: Date, date2: Date): number {
  return Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60);
}

/**
 * Check if two dates are on the same day (UTC)
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
}

/**
 * Validate that a timezone string is a valid IANA timezone identifier
 * Uses Intl.supportedValuesOf if available, otherwise falls back to try-catch
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 * @returns true if valid, false otherwise
 */
export function isValidTimezone(timezone: string | null | undefined): boolean {
  if (!timezone || typeof timezone !== "string") {
    return false;
  }

  // Use Intl.supportedValuesOf if available (modern browsers/Node.js 20+)
  try {
    if (typeof Intl.supportedValuesOf === "function") {
      const supportedTimezones = Intl.supportedValuesOf("timeZone");
      return supportedTimezones.includes(timezone);
    }
  } catch {
    // Fallback to try-catch if supportedValuesOf is not available
  }

  // Fallback: Try to create a date formatter with the timezone
  // If it throws, the timezone is invalid
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
