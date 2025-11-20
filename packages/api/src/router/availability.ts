import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { DAYS_OF_WEEK, weeklyAvailabilitySchema } from "@ssp/db/schema";

import {
  getAvailability,
  setWeeklyAvailability,
} from "../helpers/availability";
import { protectedProcedure } from "../trpc";
import { validateRequestSize } from "../utils/middleware";
import { rateLimitMutations } from "../utils/rate-limit";
import {
  validateNoOverlaps,
  validateTimeWindow,
} from "../utils/validators/availability";

/**
 * Enhanced weekly availability schema with validation
 */
const validatedWeeklyAvailabilitySchema = weeklyAvailabilitySchema
  .refine(
    (data) => {
      // Validate at least one day has availability
      return Object.values(data).some((windows) => windows.length > 0);
    },
    {
      message: "At least one day must have availability windows",
    },
  )
  .refine(
    (data) => {
      // Validate all time windows
      for (const day of DAYS_OF_WEEK) {
        const windows = data[day];
        // Skip empty days (no windows)
        if (windows.length === 0) {
          continue;
        }
        for (const window of windows) {
          try {
            validateTimeWindow(window);
          } catch {
            return false;
          }
        }
        // Validate no overlaps within each day
        try {
          validateNoOverlaps(windows);
        } catch {
          return false;
        }
      }
      return true;
    },
    {
      message: "Invalid time windows or overlapping windows detected",
    },
  );

/**
 * Availability router
 * Handles user availability management (weekly schedule)
 */
export const availabilityRouter = {
  /**
   * Get weekly availability for the authenticated user (JSON structure)
   * Returns: { userId, weeklyAvailability: { MONDAY: [...], ... }, createdAt, updatedAt }
   */
  get: protectedProcedure.query(async ({ ctx }) => {
    const availability = await getAvailability(ctx.db, ctx.session.user.id);
    if (!availability) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Availability not found",
      });
    }
    return availability;
  }),

  /**
   * Set/update weekly availability for the authenticated user (JSON structure)
   * Input: { weeklyAvailability: { MONDAY: [{ startTime, endTime }], ... } }
   * Creates a new availability record if none exists, otherwise updates existing
   */
  setWeekly: protectedProcedure
    .input(
      z.object({
        weeklyAvailability: validatedWeeklyAvailabilitySchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      validateRequestSize(ctx.headers.get("content-length"), true);
      rateLimitMutations(ctx.headers);
      return await setWeeklyAvailability(
        ctx.db,
        ctx.session.user.id,
        input.weeklyAvailability,
      );
    }),
} satisfies TRPCRouterRecord;
