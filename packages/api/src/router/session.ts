import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { CreateSessionSchema, SESSION_TYPES } from "@ssp/db/schema";

import {
  createSession,
  deleteSession,
  getAllSessions,
  getSessionById,
  getSessionsByDateRange,
  getSessionsToday,
  getSessionsWeek,
  toggleSessionComplete,
  updateSession,
} from "../helpers/session";
import { protectedProcedure } from "../trpc";

export const sessionRouter = {
  /**
   * Get all sessions for the authenticated user
   */
  all: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return getAllSessions(ctx.db, ctx.session.user.id);
  }),

  /**
   * Get sessions for a specific date range (timezone-aware)
   * Accepts dates as ISO strings or Date objects. Dates are interpreted in user's timezone.
   */
  byDateRange: protectedProcedure
    .input(
      z.object({
        startDate: z.coerce.date(), // Accepts Date objects or ISO strings
        endDate: z.coerce.date(), // Accepts Date objects or ISO strings
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      return getSessionsByDateRange(
        ctx.db,
        ctx.session.user.id,
        input.startDate,
        input.endDate,
      );
    }),

  /**
   * Get sessions for today (timezone-aware)
   * Calculates "today" based on user's timezone preference
   */
  today: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return getSessionsToday(ctx.db, ctx.session.user.id);
  }),

  /**
   * Get sessions for the current week (timezone-aware)
   * Calculates the week (Sunday to Saturday) based on user's timezone preference
   */
  week: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return getSessionsWeek(ctx.db, ctx.session.user.id);
  }),

  /**
   * Get a session by ID (only if it belongs to the authenticated user)
   */
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      return getSessionById(ctx.db, ctx.session.user.id, input.id);
    }),

  /**
   * Create a new session
   */
  create: protectedProcedure
    .input(CreateSessionSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      try {
        return await createSession(ctx.db, ctx.session.user.id, input);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to create session",
        });
      }
    }),

  /**
   * Update a session (only if it belongs to the authenticated user)
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().max(256).optional(),
        type: z.enum(SESSION_TYPES).optional(),
        startTime: z.coerce.date().optional(),
        endTime: z.coerce.date().optional(),
        completed: z.boolean().optional(),
        priority: z.coerce.number().int().min(1).max(5).optional(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const { id, ...updates } = input;
      try {
        return await updateSession(ctx.db, ctx.session.user.id, id, updates);
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
            error instanceof Error ? error.message : "Failed to update session",
        });
      }
    }),

  /**
   * Toggle completion status of a session
   */
  toggleComplete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      try {
        return await toggleSessionComplete(
          ctx.db,
          ctx.session.user.id,
          input.id,
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
              : "Failed to toggle session completion",
        });
      }
    }),

  /**
   * Delete a session (only if it belongs to the authenticated user)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      try {
        return await deleteSession(ctx.db, ctx.session.user.id, input.id);
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
            error instanceof Error ? error.message : "Failed to delete session",
        });
      }
    }),
} satisfies TRPCRouterRecord;
