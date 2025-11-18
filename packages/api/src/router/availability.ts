import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { CreateAvailabilitySchema, DAYS_OF_WEEK } from "@ssp/db/schema";

import {
  createAvailability,
  deleteAvailability,
  getAllAvailability,
  updateAvailability,
} from "../helpers/availability";
import { protectedProcedure } from "../trpc";

export const availabilityRouter = {
  /**
   * Get all availability windows for the authenticated user
   */
  all: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return getAllAvailability(ctx.db, ctx.session.user.id);
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
      try {
        return await createAvailability(ctx.db, ctx.session.user.id, input);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to create availability",
        });
      }
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
      try {
        return await updateAvailability(
          ctx.db,
          ctx.session.user.id,
          id,
          updates,
        );
      } catch (error) {
        if (error instanceof Error && error.message.includes("not found")) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to update availability",
        });
      }
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
      try {
        return await deleteAvailability(ctx.db, ctx.session.user.id, input.id);
      } catch (error) {
        if (error instanceof Error && error.message.includes("not found")) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to delete availability",
        });
      }
    }),
} satisfies TRPCRouterRecord;
