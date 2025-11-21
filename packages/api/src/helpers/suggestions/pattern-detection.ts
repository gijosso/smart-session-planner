import type { DayOfWeek, SessionType } from "@ssp/db/schema";

import { TIME_CONVERSIONS } from "../../constants/date";
import {
  PATTERN_DETECTION,
  SUGGESTION_LIMITS,
} from "../../constants/suggestions";

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
  recencyWeight: number; // Recency decay weight (0-1)
}

/**
 * Cache for timezone formatters to avoid recreating them
 */
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getTimezoneFormatter(timezone: string): Intl.DateTimeFormat {
  if (!formatterCache.has(timezone)) {
    formatterCache.set(
      timezone,
      new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        weekday: "long",
        hour: "numeric",
        minute: "numeric",
        hour12: false,
      }),
    );
  }

  return (
    formatterCache.get(timezone) ??
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "long",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    })
  );
}

/**
 * Calculate recency decay weight based on session age
 * Uses exponential decay: weight = 2^(-days_old / half_life)
 */
function calculateRecencyWeight(
  sessionTime: Date,
  halfLifeDays: number,
): number {
  const now = new Date();
  const daysOld =
    (now.getTime() - sessionTime.getTime()) / TIME_CONVERSIONS.MS_PER_DAY;
  if (daysOld <= 0) return 1;
  return Math.pow(2, -daysOld / halfLifeDays);
}

/**
 * Normalize time to fuzzy cluster center (±15 minutes)
 * Clusters times within the fuzzy window together
 */
function normalizeToFuzzyCluster(
  hour: number,
  minute: number,
): { hour: number; minute: number } {
  const totalMinutes = hour * 60 + minute;
  // Round to nearest cluster center (every 30 minutes, but allow ±15 minute window)
  const clusterSize = PATTERN_DETECTION.PATTERN_TIME_ROUNDING_MINUTES;
  const normalizedMinutes =
    Math.round(totalMinutes / clusterSize) * clusterSize;
  return {
    hour: Math.floor(normalizedMinutes / 60) % 24,
    minute: normalizedMinutes % 60,
  };
}

/**
 * Check if two times are within the fuzzy clustering window
 */
function isWithinFuzzyWindow(
  hour1: number,
  minute1: number,
  hour2: number,
  minute2: number,
  fuzzyWindowMinutes: number,
): boolean {
  const minutes1 = hour1 * 60 + minute1;
  const minutes2 = hour2 * 60 + minute2;
  return Math.abs(minutes1 - minutes2) <= fuzzyWindowMinutes;
}

/**
 * Analyze past sessions to detect repeating patterns
 * Groups sessions by type, day of week, and time of day using fuzzy clustering
 * Improved: Tracks completion rate, most frequent title, and recency decay
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

  if (filteredSessions.length === 0) {
    return [];
  }

  const formatter = getTimezoneFormatter(userTimezone);

  // Group sessions by pattern key: type + dayOfWeek + fuzzy time cluster
  // Use a more efficient structure: group by type+day first, then cluster times
  const patternMap = new Map<
    string,
    SessionPattern & {
      completedCount: number;
      titleFrequency: Map<string, number>;
      totalRecencyWeight: number;
      totalMinutes: number; // For weighted time averaging
    }
  >();

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

  for (const session of filteredSessions) {
    // Get day of week and time in user's timezone
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

    const dayOfWeek = dayOfWeekMap[weekday];
    if (!dayOfWeek) continue;

    // Normalize to fuzzy cluster center
    const normalized = normalizeToFuzzyCluster(hour, minute);

    const durationMinutes = Math.round(
      (session.endTime.getTime() - session.startTime.getTime()) /
        TIME_CONVERSIONS.MS_PER_MINUTE,
    );

    // Try to find existing pattern within fuzzy window
    // Optimize: only check patterns of same type and day
    const typeDayKey = `${session.type}-${dayOfWeek}`;
    let matchedPattern:
      | (SessionPattern & {
          completedCount: number;
          titleFrequency: Map<string, number>;
          totalRecencyWeight: number;
          totalMinutes: number;
        })
      | null = null;
    let matchedKey: string | null = null;

    // Only check patterns matching type and day (much faster than checking all)
    for (const [key, pattern] of patternMap.entries()) {
      if (!key.startsWith(typeDayKey)) continue;

      if (
        isWithinFuzzyWindow(
          pattern.hour,
          pattern.minute,
          normalized.hour,
          normalized.minute,
          PATTERN_DETECTION.FUZZY_TIME_WINDOW_MINUTES,
        )
      ) {
        matchedPattern = pattern;
        matchedKey = key;
        break;
      }
    }

    const recencyWeight = calculateRecencyWeight(
      session.startTime,
      PATTERN_DETECTION.RECENCY_HALF_LIFE_DAYS,
    );

    if (matchedPattern && matchedKey) {
      // Update existing pattern
      const pattern = matchedPattern;
      const newTotalMinutes = normalized.hour * 60 + normalized.minute;

      // Update time using simple moving average (frequency-based, not recency-weighted)
      // Recency is handled separately in scoring
      pattern.totalMinutes =
        (pattern.totalMinutes * pattern.frequency + newTotalMinutes) /
        (pattern.frequency + 1);
      pattern.hour = Math.floor(pattern.totalMinutes / 60) % 24;
      pattern.minute = Math.floor(pattern.totalMinutes % 60);

      // Validate duration before updating
      const newDurationMinutes = Math.round(
        (pattern.durationMinutes * pattern.frequency + durationMinutes) /
          (pattern.frequency + 1),
      );
      // Clamp duration to reasonable bounds
      pattern.durationMinutes = Math.max(
        SUGGESTION_LIMITS.MIN_PATTERN_DURATION_MINUTES,
        Math.min(
          SUGGESTION_LIMITS.MAX_PATTERN_DURATION_MINUTES,
          newDurationMinutes,
        ),
      );

      pattern.priority = Math.round(
        (pattern.priority * pattern.frequency + session.priority) /
          (pattern.frequency + 1),
      );
      pattern.frequency += 1;
      pattern.completedCount += session.completed ? 1 : 0;
      pattern.successRate = pattern.completedCount / pattern.frequency;
      pattern.totalRecencyWeight += recencyWeight;

      // Track title frequency
      const titleCount = pattern.titleFrequency.get(session.title) ?? 0;
      pattern.titleFrequency.set(session.title, titleCount + 1);

      // Update most common title
      let maxTitleCount = 0;
      let mostCommonTitle = pattern.title;
      for (const [title, count] of pattern.titleFrequency.entries()) {
        if (count > maxTitleCount) {
          maxTitleCount = count;
          mostCommonTitle = title;
        }
      }
      pattern.title = mostCommonTitle;
    } else {
      // Create new pattern
      const patternKey = `${session.type}-${dayOfWeek}-${normalized.hour}-${normalized.minute}`;
      const titleFrequency = new Map<string, number>();
      titleFrequency.set(session.title, 1);

      // Validate duration
      const validatedDuration = Math.max(
        SUGGESTION_LIMITS.MIN_PATTERN_DURATION_MINUTES,
        Math.min(
          SUGGESTION_LIMITS.MAX_PATTERN_DURATION_MINUTES,
          durationMinutes,
        ),
      );

      const totalMinutes = normalized.hour * 60 + normalized.minute;
      patternMap.set(patternKey, {
        type: session.type,
        dayOfWeek,
        hour: normalized.hour,
        minute: normalized.minute,
        durationMinutes: validatedDuration,
        priority: session.priority,
        frequency: 1,
        completedCount: session.completed ? 1 : 0,
        title: session.title,
        successRate: session.completed ? 1 : 0,
        recencyWeight: recencyWeight,
        totalRecencyWeight: recencyWeight,
        totalMinutes,
        titleFrequency,
      });
    }
  }

  // Calculate average recency weight for each pattern and clean up
  return Array.from(patternMap.values())
    .filter((p) => p.frequency >= PATTERN_DETECTION.MIN_PATTERN_FREQUENCY)
    .map((pattern) => {
      // Calculate average recency weight
      const avgRecencyWeight = pattern.totalRecencyWeight / pattern.frequency;

      // Clean up internal fields
      const {
        completedCount: _completedCount,
        titleFrequency: _titleFrequency,
        totalRecencyWeight: _totalRecencyWeight,
        totalMinutes: _totalMinutes,
        ...cleanPattern
      } = pattern;

      return {
        ...cleanPattern,
        recencyWeight: avgRecencyWeight,
      };
    })
    .sort((a, b) => {
      // Sort by success rate first (higher is better), then frequency, then recency
      if (
        Math.abs(a.successRate - b.successRate) >
        PATTERN_DETECTION.SUCCESS_RATE_DIFFERENCE_THRESHOLD
      ) {
        return b.successRate - a.successRate;
      }
      if (a.frequency !== b.frequency) {
        return b.frequency - a.frequency;
      }
      return b.recencyWeight - a.recencyWeight;
    });
}
