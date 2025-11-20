import { TRPCError } from "@trpc/server";

import {
  AVAILABILITY_CONSTANTS,
  DATE_CONSTANTS,
  TIME_CONSTANTS_EXPORTED,
} from "../constants";

/**
 * Parse time string (HH:MM:SS) to milliseconds since midnight
 * Validates format and values, throws TRPCError on invalid input
 */
function parseTimeToMs(time: string): number {
  const parts = time.split(":");

  // Validate format (should have 3 parts: HH:MM:SS)
  if (parts.length !== 3) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Time must be in HH:MM:SS format",
    });
  }

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  const seconds = Number(parts[2]);

  // Validate time values
  if (
    Number.isNaN(hours) ||
    hours < 0 ||
    hours > 23 ||
    Number.isNaN(minutes) ||
    minutes < 0 ||
    minutes > 59 ||
    Number.isNaN(seconds) ||
    seconds < 0 ||
    seconds > 59
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid time values",
    });
  }

  // Convert to milliseconds
  return (
    hours * TIME_CONSTANTS_EXPORTED.MS_PER_HOUR +
    minutes * DATE_CONSTANTS.MS_PER_MINUTE +
    seconds * DATE_CONSTANTS.MS_PER_SECOND
  );
}

/**
 * Validate time window constraints
 */
export const validateTimeWindow = (window: {
  startTime: string;
  endTime: string;
}): void => {
  const startMs = parseTimeToMs(window.startTime);
  const endMs = parseTimeToMs(window.endTime);

  // Validate startTime < endTime
  if (endMs <= startMs) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "End time must be after start time",
    });
  }

  // Validate duration constraints
  const durationMs = endMs - startMs;
  if (durationMs < AVAILABILITY_CONSTANTS.MIN_WINDOW_DURATION_MS) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Time window must be at least ${AVAILABILITY_CONSTANTS.MIN_WINDOW_DURATION_MINUTES} minutes`,
    });
  }

  if (durationMs > AVAILABILITY_CONSTANTS.MAX_WINDOW_DURATION_MS) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Time window cannot exceed ${AVAILABILITY_CONSTANTS.MAX_WINDOW_DURATION_HOURS} hours`,
    });
  }
};

/**
 * Validate that windows don't overlap within a day
 * Optimized: Sort windows first, then single-pass check (O(n log n) vs O(n²))
 */
export const validateNoOverlaps = (
  windows: { startTime: string; endTime: string }[],
): void => {
  if (windows.length <= 1) {
    return; // No overlaps possible with 0 or 1 window
  }

  // Parse all windows to milliseconds and sort by start time
  const parsedWindows = windows
    .map((window) => ({
      startMs: parseTimeToMs(window.startTime),
      endMs: parseTimeToMs(window.endTime),
    }))
    .sort((a, b) => a.startMs - b.startMs);

  // Single pass check: if sorted, we only need to check adjacent windows
  // Since windows are sorted by start time, if window[i] overlaps with window[j],
  // it must also overlap with window[i+1] (if i+1 < j)
  // So we only need to check each window against the next one
  for (let i = 0; i < parsedWindows.length - 1; i++) {
    const current = parsedWindows[i];
    const next = parsedWindows[i + 1];

    if (!current || !next) {
      continue; // Skip if undefined (shouldn't happen, but defensive)
    }

    // Check for overlap: start1 < end2 AND start2 < end1
    if (current.startMs < next.endMs && next.startMs < current.endMs) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Time windows cannot overlap within the same day",
      });
    }
  }
};
