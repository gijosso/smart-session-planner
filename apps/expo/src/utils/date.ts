/**
 * Date manipulation utilities for the expo app
 * Centralized date formatting and manipulation functions
 */

import { MS_PER_DAY } from "~/constants/time";

/**
 * Get today's date in YYYY-MM-DD format for form inputs
 */
export const getTodayDate = (): string => {
  const today = new Date();
  return today.toISOString().split("T")[0] ?? "";
};

/**
 * Get current time in HH:mm format for form inputs
 */
export const getCurrentTime = (): string => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};

/**
 * Safely convert a value to a Date object
 * Handles Date objects, ISO strings, and other date formats
 */
const toDate = (value: Date | string | null | undefined): Date | null => {
  if (!value) return null;

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
};

/**
 * Format date to YYYY-MM-DD format (for form inputs)
 * Safely handles Date objects, strings, null, and undefined
 * Converts dates to local date string (not UTC) to preserve user's timezone
 */
export const formatDateForInput = (
  date: Date | string | null | undefined,
): string => {
  const d = toDate(date);
  if (!d) return "";

  try {
    // Use local date components to preserve user's timezone
    // This ensures the date shown matches what the user expects
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return "";
  }
};

/**
 * Format time to HH:mm format (for form inputs)
 * Safely handles Date objects, strings, null, and undefined
 * Uses local time to preserve user's timezone
 */
export const formatTimeForInput = (
  date: Date | string | null | undefined,
): string => {
  const d = toDate(date);
  if (!d) return "00:00";

  try {
    // Use local time components to preserve user's timezone
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  } catch {
    return "00:00";
  }
};

/**
 * Format time for display (12-hour format with AM/PM)
 * Example: "2:30 PM"
 */
export const formatTimeForDisplay = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Format date for display (long format)
 * Example: "Monday, November 18, 2024"
 */
export const formatDateForDisplay = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * Format date for display (short format with weekday)
 * Example: "Monday, Nov 18"
 */
export const formatDateShort = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
};

/**
 * Format time range for display
 * Example: "2:30 PM - 4:00 PM"
 */
export const formatTimeRange = (
  start: Date | string,
  end: Date | string,
): string => {
  return `${formatTimeForDisplay(start)} - ${formatTimeForDisplay(end)}`;
};

/**
 * Safely convert a value to a Date object
 * Returns null if conversion fails
 */
export const safeToDate = (
  value: Date | string | null | undefined,
): Date | null => {
  if (!value) return null;

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
};

/**
 * Convert a Date object to ISO string for API submission
 * Ensures dates are properly serialized when sent to the backend
 * Returns empty string if date is invalid
 */
export const dateToISOString = (date: Date | null | undefined): string => {
  if (!date) return "";

  if (!(date instanceof Date)) {
    return "";
  }

  if (isNaN(date.getTime())) {
    return "";
  }

  try {
    return date.toISOString();
  } catch {
    return "";
  }
};

/**
 * Formats time from HH:MM:SS to HH:MM
 * Used for displaying time windows in availability settings
 */
export const formatTimeFromFull = (time: string): string => {
  return time.split(":").slice(0, 2).join(":");
};

/**
 * Converts HH:MM to HH:MM:SS format
 * Used for storing time windows in availability settings
 */
export const formatTimeToFull = (time: string): string => {
  return `${time}:00`;
};

/**
 * Validates time format (HH:MM)
 * Returns true if time is in valid format
 */
export const isValidTimeFormat = (time: string): boolean => {
  const regex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(time);
};

/**
 * Parse date and time strings into a Date object in the user's local timezone
 * Properly handles timezone conversion to ensure dates are interpreted correctly
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timeStr - Time string in HH:mm format
 * @returns Date object in local timezone, or null if invalid
 */
export function parseLocalDateTime(
  dateStr: string,
  timeStr: string,
): Date | null {
  if (!dateStr || !timeStr) return null;

  try {
    // Split time string to get hours and minutes
    const [hours, minutes] = timeStr.split(":").map(Number);

    if (typeof hours !== "number" || typeof minutes !== "number") {
      return null;
    }

    if (isNaN(hours) || isNaN(minutes)) {
      return null;
    }

    // Split date string to get year, month, day
    const [year, month, day] = dateStr.split("-").map(Number);

    if (
      typeof year !== "number" ||
      typeof month !== "number" ||
      typeof day !== "number"
    ) {
      return null;
    }

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return null;
    }

    // Create date in local timezone (month is 0-indexed in Date constructor)
    const date = new Date(year, month - 1, day, hours, minutes, 0, 0);

    // Validate the date
    if (isNaN(date.getTime())) {
      return null;
    }

    // Verify the date components match (handles invalid dates like Feb 30)
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day ||
      date.getHours() !== hours ||
      date.getMinutes() !== minutes
    ) {
      return null;
    }

    return date;
  } catch {
    return null;
  }
}

/**
 * Add minutes to a date/time combination and return formatted date and time strings
 * Used for calculating end date/time from start date/time
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timeStr - Time string in HH:mm format
 * @param minutesToAdd - Number of minutes to add (default: 30)
 * @returns Object with endDate and endTime strings, or null if input is invalid
 */
export function addMinutesToDateTime(
  dateStr: string,
  timeStr: string,
  minutesToAdd: number = 30,
): { endDate: string; endTime: string } | null {
  const startDate = parseLocalDateTime(dateStr, timeStr);
  if (!startDate) return null;

  const endDate = new Date(startDate.getTime() + minutesToAdd * 60 * 1000);
  return {
    endDate: formatDateForInput(endDate),
    endTime: formatTimeForInput(endDate),
  };
}

/**
 * Format a date to display as "Today", "Tomorrow", "Yesterday", or date
 * Used for suggestion and session date displays
 */
export function formatDateDisplay(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const suggestionDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor(
    (suggestionDate.getTime() - today.getTime()) / MS_PER_DAY,
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
