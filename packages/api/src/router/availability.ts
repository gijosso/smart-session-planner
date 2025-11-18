import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { and, eq } from "@ssp/db";
import {
  Availability,
  CreateAvailabilitySchema,
  DAYS_OF_WEEK,
} from "@ssp/db/schema";

import { protectedProcedure } from "../trpc";

export const availabilityRouter = {
  /**
   * Get all availability windows for the authenticated user
   */
  all: protectedProcedure.query(({ ctx }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return ctx.db.query.Availability.findMany({
      where: eq(Availability.userId, ctx.session.user.id),
      orderBy: [Availability.dayOfWeek, Availability.startTime],
    });
  }),

  /**
   * Create a new availability window
   */
  create: protectedProcedure
    .input(CreateAvailabilitySchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const [result] = await ctx.db
        .insert(Availability)
        .values({
          ...input,
          userId: ctx.session.user.id,
        })
        .returning();

      if (!result) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      return result;
    }),

  /**
   * Update an availability window (only if it belongs to the authenticated user)
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        dayOfWeek: z.enum(DAYS_OF_WEEK).optional(),
        startTime: z
          .string()
          .regex(/^\d{2}:\d{2}:\d{2}$/, "Start time must be in HH:MM:SS format")
          .optional(),
        endTime: z
          .string()
          .regex(/^\d{2}:\d{2}:\d{2}$/, "End time must be in HH:MM:SS format")
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const { id, ...updates } = input;

      // Verify the availability belongs to the user
      const existingAvailability = await ctx.db.query.Availability.findFirst({
        where: and(
          eq(Availability.id, id),
          eq(Availability.userId, ctx.session.user.id),
        ),
      });

      if (!existingAvailability) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Availability not found or access denied",
        });
      }

      const [updated] = await ctx.db
        .update(Availability)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(Availability.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      return updated;
    }),

  /**
   * Delete an availability window (only if it belongs to the authenticated user)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      // Verify the availability belongs to the user
      const existingAvailability = await ctx.db.query.Availability.findFirst({
        where: and(
          eq(Availability.id, input.id),
          eq(Availability.userId, ctx.session.user.id),
        ),
      });

      if (!existingAvailability) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Availability not found or access denied",
        });
      }

      return ctx.db.delete(Availability).where(eq(Availability.id, input.id));
    }),
} satisfies TRPCRouterRecord;
