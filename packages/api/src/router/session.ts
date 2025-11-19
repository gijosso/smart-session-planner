import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { CreateSessionSchema, SESSION_TYPES } from "@ssp/db/schema";

import {
  checkSessionConflicts,
  createSession,
  deleteSession,
  getAllSessions,
  getSessionById,
  getSessionsByDateRange,
  getSessionsToday,
  getSessionsWeek,
  getUpcomingSessions,
  toggleSessionComplete,
  updateSession,
} from "../helpers/session";
import { suggestTimeSlots } from "../helpers/suggestions";
import { protectedProcedure } from "../trpc";
import { handleDatabaseError } from "../utils/db-errors";

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
   * Get all upcoming (future) sessions for the authenticated user
   */
  upcoming: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return getUpcomingSessions(ctx.db, ctx.session.user.id);
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
   * Optionally allows conflicts (default: false - conflicts will throw error)
   */
  create: protectedProcedure
    .input(
      CreateSessionSchema.extend({
        allowConflicts: z.boolean().optional().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const { allowConflicts, ...sessionInput } = input;
      try {
        return await createSession(
          ctx.db,
          ctx.session.user.id,
          sessionInput,
          allowConflicts,
        );
      } catch (error) {
        handleDatabaseError(error, "create session");
      }
    }),

  /**
   * Update a session (only if it belongs to the authenticated user)
   * Optionally allows conflicts (default: false - conflicts will throw error)
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
        allowConflicts: z.boolean().optional().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const { id, allowConflicts, ...updates } = input;
      try {
        return await updateSession(
          ctx.db,
          ctx.session.user.id,
          id,
          updates,
          allowConflicts,
        );
      } catch (error) {
        handleDatabaseError(error, "update session");
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
        handleDatabaseError(error, "toggle session completion");
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
        handleDatabaseError(error, "delete session");
      }
    }),

  /**
   * Check if a time range conflicts with existing sessions
   */
  checkConflicts: protectedProcedure
    .input(
      z.object({
        startTime: z.coerce.date(),
        endTime: z.coerce.date(),
        excludeSessionId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      return checkSessionConflicts(
        ctx.db,
        ctx.session.user.id,
        input.startTime,
        input.endTime,
        input.excludeSessionId,
      );
    }),

  /**
   * Get smart time slot suggestions based on repeating task patterns
   * Analyzes past sessions to detect patterns and suggests future slots
   */
  suggest: protectedProcedure
    .input(
      z.object({
        startDate: z.coerce.date().optional(),
        lookAheadDays: z.number().int().min(1).max(30).optional().default(14),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      return suggestTimeSlots(ctx.db, ctx.session.user.id, input);
    }),
} satisfies TRPCRouterRecord;
