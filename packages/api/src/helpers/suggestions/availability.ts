import type { DayOfWeek, WeeklyAvailability } from "@ssp/db/schema";

import { timeRangesOverlap, timeToMinutes } from "../../utils/date";

/**
 * Check if a time slot is within user's availability windows
 */
export function isWithinAvailability(
  startTime: Date,
  endTime: Date,
  weeklyAvailability: WeeklyAvailability,
  userTimezone: string,
): { valid: boolean; reason?: string } {
  // Get day of week for the start time
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: userTimezone,
    weekday: "long",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });

  const startParts = formatter.formatToParts(startTime);
  const weekday = startParts.find((p) => p.type === "weekday")?.value ?? "";
  const startHour = Number.parseInt(
    startParts.find((p) => p.type === "hour")?.value ?? "0",
    10,
  );
  const startMinute = Number.parseInt(
    startParts.find((p) => p.type === "minute")?.value ?? "0",
    10,
  );

  const endParts = formatter.formatToParts(endTime);
  const endHour = Number.parseInt(
    endParts.find((p) => p.type === "hour")?.value ?? "0",
    10,
  );
  const endMinute = Number.parseInt(
    endParts.find((p) => p.type === "minute")?.value ?? "0",
    10,
  );

  const dayOfWeekMap: Record<string, DayOfWeek> = {
    Monday: "MONDAY",
    Tuesday: "TUESDAY",
    Wednesday: "WEDNESDAY",
    Thursday: "THURSDAY",
    Friday: "FRIDAY",
    Saturday: "SATURDAY",
    Sunday: "SUNDAY",
  };
  const dayOfWeek = dayOfWeekMap[weekday] as DayOfWeek | undefined;
  if (!dayOfWeek) {
    return { valid: false, reason: "Invalid day of week" };
  }

  const availabilityWindows = weeklyAvailability[dayOfWeek];
  // Type system guarantees availabilityWindows exists, but check length at runtime
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!availabilityWindows || availabilityWindows.length === 0) {
    return { valid: false, reason: `No availability set for ${weekday}` };
  }

  const startTimeStr = `${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}:00`;
  const endTimeStr = `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}:00`;

  // Check if the session time overlaps with any availability window
  for (const window of availabilityWindows) {
    if (
      timeRangesOverlap(
        startTimeStr,
        endTimeStr,
        window.startTime,
        window.endTime,
      )
    ) {
      // Check if session is fully within the window
      const windowStartMin = timeToMinutes(window.startTime);
      const windowEndMin = timeToMinutes(window.endTime);
      const sessionStartMin = timeToMinutes(startTimeStr);
      const sessionEndMin = timeToMinutes(endTimeStr);

      if (sessionStartMin >= windowStartMin && sessionEndMin <= windowEndMin) {
        return { valid: true };
      }
    }
  }

  return { valid: false, reason: "Outside availability windows" };
}

