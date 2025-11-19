import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { weeklyAvailabilitySchema } from "@ssp/db/schema";

import {
  getAvailability,
  setWeeklyAvailability,
} from "../helpers/availability";
import { protectedProcedure } from "../trpc";

export const availabilityRouter = {
  /**
   * Get weekly availability for the authenticated user (JSON structure)
   * Returns: { id, userId, weeklyAvailability: { MONDAY: [...], ... }, createdAt, updatedAt }
   */
  get: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
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
   */
  setWeekly: protectedProcedure
    .input(
      z.object({
        weeklyAvailability: weeklyAvailabilitySchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      try {
        return await setWeeklyAvailability(
          ctx.db,
          ctx.session.user.id,
          input.weeklyAvailability,
        );
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to set weekly availability",
        });
      }
    }),
} satisfies TRPCRouterRecord;
