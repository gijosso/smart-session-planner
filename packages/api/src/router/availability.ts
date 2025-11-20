import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { weeklyAvailabilitySchema } from "@ssp/db/schema";

import {
  getAvailability,
  setWeeklyAvailability,
} from "../helpers/availability";
import { protectedProcedure } from "../trpc";
import { handleAsyncOperation } from "../utils/db-errors";

/**
 * Extract userId from context - protectedProcedure guarantees it exists
 */
function getUserId(ctx: { session: { user: { id: string } } | null }): string {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return ctx.session.user.id;
}

export const availabilityRouter = {
  /**
   * Get weekly availability for the authenticated user (JSON structure)
   * Returns: { userId, weeklyAvailability: { MONDAY: [...], ... }, createdAt, updatedAt }
   */
  get: protectedProcedure.query(async ({ ctx }) => {
    const userId = getUserId(ctx);
    const availability = await handleAsyncOperation(
      async () => getAvailability(ctx.db, userId),
      "get availability",
      { userId },
    );

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
      const userId = getUserId(ctx);
      return handleAsyncOperation(
        async () =>
          setWeeklyAvailability(ctx.db, userId, input.weeklyAvailability),
        "set weekly availability",
        { userId },
      );
    }),
} satisfies TRPCRouterRecord;
