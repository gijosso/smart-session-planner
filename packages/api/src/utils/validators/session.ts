import { z } from "zod/v4";

import { dateRangeSchema } from "@ssp/validators";

import { DATE_CONSTANTS, REQUEST_CONSTANTS } from "../constants";
import { validatedTimeRangeSchema } from "./time-range";

/**
 * Validated date range schema with all constraints
 * Extracted from router to ensure consistency and reusability
 */
export const validatedDateRangeSchema = dateRangeSchema
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be after or equal to start date",
    path: ["endDate"],
  })
  .refine(
    (data) => {
      const diffMs = data.endDate.getTime() - data.startDate.getTime();
      const diffDays = diffMs / DATE_CONSTANTS.MS_PER_DAY;
      return diffDays <= REQUEST_CONSTANTS.MAX_DATE_RANGE_DAYS;
    },
    {
      message: `Date range cannot exceed ${REQUEST_CONSTANTS.MAX_DATE_RANGE_DAYS} days`,
      path: ["endDate"],
    },
  )
  .refine(
    (data) => {
      const now = new Date();
      if (
        !(data.startDate instanceof Date) ||
        isNaN(data.startDate.getTime())
      ) {
        return false;
      }
      const maxPastDate = new Date(
        now.getTime() -
          REQUEST_CONSTANTS.MAX_PAST_YEARS *
            REQUEST_CONSTANTS.DAYS_PER_YEAR *
            DATE_CONSTANTS.MS_PER_DAY,
      );
      return data.startDate >= maxPastDate;
    },
    {
      message: `Start date cannot be more than ${REQUEST_CONSTANTS.MAX_PAST_YEARS} years in the past`,
      path: ["startDate"],
    },
  )
  .refine(
    (data) => {
      const now = new Date();
      if (!(data.endDate instanceof Date) || isNaN(data.endDate.getTime())) {
        return false;
      }
      const maxFutureDate = new Date(
        now.getTime() +
          REQUEST_CONSTANTS.MAX_FUTURE_YEARS *
            REQUEST_CONSTANTS.DAYS_PER_YEAR *
            DATE_CONSTANTS.MS_PER_DAY,
      );
      return data.endDate <= maxFutureDate;
    },
    {
      message: `End date cannot be more than ${REQUEST_CONSTANTS.MAX_FUTURE_YEARS} years in the future`,
      path: ["endDate"],
    },
  );

// Re-export validatedTimeRangeSchema from time-range.ts for backward compatibility
export { validatedTimeRangeSchema };

/**
 * Session ID schema with UUID validation
 */
export const sessionIdSchema = z.string().uuid("Invalid session ID format");

/**
 * Pagination schema (offset-based - for backward compatibility)
 */
export const paginationSchema = z
  .object({
    limit: z.number().int().min(1).max(100).optional().default(50),
    offset: z.number().int().min(0).optional().default(0),
  })
  .optional();

/**
 * Cursor-based pagination schema (more efficient for large datasets)
 * Uses the start_time of the last session as the cursor
 */
export const cursorPaginationSchema = z
  .object({
    limit: z.number().int().min(1).max(100).optional().default(50),
    cursor: z.string().datetime().optional(), // ISO datetime string of last session's startTime
  })
  .optional();

/**
 * Suggestion input schema with validation
 */
export const suggestionInputSchema = z
  .object({
    startDate: z
      .date()
      .refine(
        (date) => {
          // Allow dates that are very close to now (within 1 second) to account for timing
          const now = new Date();
          const oneSecondAgo = new Date(now.getTime() - 1000);
          return date >= oneSecondAgo;
        },
        {
          message: "Start date cannot be in the past",
        },
      )
      .optional(),
    lookAheadDays: z.number().int().min(1).max(30).optional().default(14),
  })
  .refine(
    (data) => {
      if (data.startDate) {
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + (data.lookAheadDays ?? 14));
        return data.startDate <= maxDate;
      }
      return true;
    },
    {
      message: "Start date cannot be more than lookAheadDays in the future",
      path: ["startDate"],
    },
  );
