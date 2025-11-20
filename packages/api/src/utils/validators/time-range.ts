import { z } from "zod/v4";

/**
 * Reusable time range validation utilities
 * Centralizes validation logic to avoid duplication
 */

/**
 * Validate that end time is after start time
 * Returns true if valid, throws error if invalid
 */
export function validateTimeRange(startTime: Date, endTime: Date): void {
  if (!(startTime instanceof Date) || isNaN(startTime.getTime())) {
    throw new Error("Invalid start time provided");
  }
  if (!(endTime instanceof Date) || isNaN(endTime.getTime())) {
    throw new Error("Invalid end time provided");
  }
  if (endTime <= startTime) {
    throw new Error("End time must be after start time");
  }
}

/**
 * Validate time range with existing session times
 * Used when updating only one time field (startTime or endTime)
 */
export function validateTimeRangeWithExisting(
  newTime: Date,
  existingStartTime: Date,
  existingEndTime: Date,
  isStartTime: boolean,
): void {
  if (!(newTime instanceof Date) || isNaN(newTime.getTime())) {
    throw new Error(`Invalid ${isStartTime ? "start" : "end"} time provided`);
  }
  if (!(existingStartTime instanceof Date) || isNaN(existingStartTime.getTime())) {
    throw new Error("Invalid existing start time");
  }
  if (!(existingEndTime instanceof Date) || isNaN(existingEndTime.getTime())) {
    throw new Error("Invalid existing end time");
  }

  if (isStartTime) {
    // New startTime must be before existing endTime
    if (existingEndTime <= newTime) {
      throw new Error("End time must be after start time");
    }
  } else {
    // New endTime must be after existing startTime
    if (newTime <= existingStartTime) {
      throw new Error("End time must be after start time");
    }
  }
}

/**
 * Zod schema for validated time range
 * Ensures end time is after start time
 */
export const validatedTimeRangeSchema = z
  .object({
    startTime: z.date(),
    endTime: z.date(),
  })
  .refine(
    (data) => {
      if (
        !(data.startTime instanceof Date) ||
        isNaN(data.startTime.getTime()) ||
        !(data.endTime instanceof Date) ||
        isNaN(data.endTime.getTime())
      ) {
        return false;
      }
      return data.endTime > data.startTime;
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    },
  );

