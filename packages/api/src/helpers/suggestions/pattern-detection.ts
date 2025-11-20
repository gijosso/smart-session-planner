import type { DayOfWeek, SessionType } from "@ssp/db/schema";

import { PATTERN_DETECTION } from "../../constants/suggestions";
import { TIME_CONVERSIONS } from "../../constants/date";

/**
 * Pattern detected from past sessions
 */
export interface SessionPattern {
  type: SessionType;
  dayOfWeek: DayOfWeek;
  hour: number; // Hour in user's timezone (0-23)
  minute: number; // Minute (0-59)
  durationMinutes: number; // Average duration
  priority: number; // Average priority
  frequency: number; // How many times this pattern occurred
  title: string; // Most common title for this pattern
  successRate: number; // Completion rate for this pattern (0-1)
}

/**
 * Analyze past sessions to detect repeating patterns
 * Groups sessions by type, day of week, and time of day
 * Improved: Also tracks completion rate (success rate) for each pattern
 */
export function detectPatterns(
  sessions: {
    type: SessionType;
    title: string;
    startTime: Date;
    endTime: Date;
    priority: number;
    completed: boolean;
  }[],
  userTimezone: string,
): SessionPattern[] {
  // Filter out CLIENT_MEETING sessions
  const filteredSessions = sessions.filter((s) => s.type !== "CLIENT_MEETING");

  // Group sessions by pattern key: type + dayOfWeek + hour
  const patternMap = new Map<
    string,
    SessionPattern & { completedCount: number }
  >();

  for (const session of filteredSessions) {
    // Get day of week and time in user's timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: userTimezone,
      weekday: "long",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });

    const parts = formatter.formatToParts(session.startTime);
    const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
    const hour = Number.parseInt(
      parts.find((p) => p.type === "hour")?.value ?? "0",
      10,
    );
    const minute = Number.parseInt(
      parts.find((p) => p.type === "minute")?.value ?? "0",
      10,
    );

    // Map weekday to DayOfWeek enum
    const dayOfWeekMap: Record<string, DayOfWeek> = {
      Monday: "MONDAY",
      Tuesday: "TUESDAY",
      Wednesday: "WEDNESDAY",
      Thursday: "THURSDAY",
      Friday: "FRIDAY",
      Saturday: "SATURDAY",
      Sunday: "SUNDAY",
    };
    const dayOfWeek = dayOfWeekMap[weekday];
    if (!dayOfWeek) continue;

    // Round to nearest 30 minutes for pattern matching (allows flexibility)
    const roundedHour = hour;
    const roundedMinute =
      minute < PATTERN_DETECTION.PATTERN_TIME_ROUNDING_MINUTES
        ? 0
        : PATTERN_DETECTION.PATTERN_TIME_ROUNDING_MINUTES;

    const durationMinutes = Math.round(
      (session.endTime.getTime() - session.startTime.getTime()) /
        TIME_CONVERSIONS.MS_PER_MINUTE,
    );

    const patternKey = `${session.type}-${dayOfWeek}-${roundedHour}-${roundedMinute}`;

    if (!patternMap.has(patternKey)) {
      patternMap.set(patternKey, {
        type: session.type,
        dayOfWeek,
        hour: roundedHour,
        minute: roundedMinute,
        durationMinutes,
        priority: session.priority,
        frequency: 1,
        completedCount: session.completed ? 1 : 0,
        title: session.title,
        successRate: session.completed ? 1 : 0,
      });
    } else {
      const pattern = patternMap.get(patternKey);
      if (pattern) {
        // Update averages
        pattern.durationMinutes = Math.round(
          (pattern.durationMinutes * pattern.frequency + durationMinutes) /
            (pattern.frequency + 1),
        );
        pattern.priority = Math.round(
          (pattern.priority * pattern.frequency + session.priority) /
            (pattern.frequency + 1),
        );
        pattern.frequency += 1;
        pattern.completedCount += session.completed ? 1 : 0;
        pattern.successRate = pattern.completedCount / pattern.frequency;
        // Use most common title (keep first one for now, could improve with frequency tracking)
      }
    }
  }

  // Return patterns sorted by frequency and success rate
  return Array.from(patternMap.values())
    .filter((p) => p.frequency >= PATTERN_DETECTION.MIN_PATTERN_FREQUENCY)
    .map(({ completedCount: _completedCount, ...pattern }) => pattern) // Remove completedCount from output
    .sort((a, b) => {
      // Sort by success rate first (higher is better), then frequency
      if (
        Math.abs(a.successRate - b.successRate) >
        PATTERN_DETECTION.SUCCESS_RATE_DIFFERENCE_THRESHOLD
      ) {
        return b.successRate - a.successRate;
      }
      return b.frequency - a.frequency;
    });
}

