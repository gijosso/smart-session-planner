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

export const sessionRouter = {
  /**
   * Get all sessions for the authenticated user
   */
  all: protectedProcedure.query(async ({ ctx }) => {
    const userId = getUserId(ctx);
    return handleAsyncOperation(
      async () => getAllSessions(ctx.db, userId),
      "get all sessions",
      { userId },
    );
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
      const userId = getUserId(ctx);
      return handleAsyncOperation(
        async () =>
          getSessionsByDateRange(
            ctx.db,
            userId,
            input.startDate,
            input.endDate,
          ),
        "get sessions by date range",
        {
          userId,
          startDate: input.startDate.toISOString(),
          endDate: input.endDate.toISOString(),
        },
      );
    }),

  /**
   * Get sessions for today (timezone-aware)
   * Calculates "today" based on user's timezone preference
   */
  today: protectedProcedure.query(async ({ ctx }) => {
    const userId = getUserId(ctx);
    return handleAsyncOperation(
      async () => getSessionsToday(ctx.db, userId),
      "get sessions today",
      { userId },
    );
  }),

  /**
   * Get sessions for the current week (timezone-aware)
   * Calculates the week (Sunday to Saturday) based on user's timezone preference
   */
  week: protectedProcedure.query(async ({ ctx }) => {
    const userId = getUserId(ctx);
    return handleAsyncOperation(
      async () => getSessionsWeek(ctx.db, userId),
      "get sessions week",
      { userId },
    );
  }),

  /**
   * Get all upcoming (future) sessions for the authenticated user
   */
  upcoming: protectedProcedure.query(async ({ ctx }) => {
    const userId = getUserId(ctx);
    return handleAsyncOperation(
      async () => getUpcomingSessions(ctx.db, userId),
      "get upcoming sessions",
      { userId },
    );
  }),

  /**
   * Get a session by ID (only if it belongs to the authenticated user)
   */
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = getUserId(ctx);
      return handleAsyncOperation(
        async () => getSessionById(ctx.db, userId, input.id),
        "get session by id",
        { userId, sessionId: input.id },
      );
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
      const userId = getUserId(ctx);
      const { allowConflicts, ...sessionInput } = input;
      return handleAsyncOperation(
        async () => createSession(ctx.db, userId, sessionInput, allowConflicts),
        "create session",
        {
          userId,
          allowConflicts,
        },
      );
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
      const userId = getUserId(ctx);
      const { id, allowConflicts, ...updates } = input;
      return handleAsyncOperation(
        async () => updateSession(ctx.db, userId, id, updates, allowConflicts),
        "update session",
        {
          userId,
          sessionId: id,
          allowConflicts,
        },
      );
    }),

  /**
   * Toggle completion status of a session
   */
  toggleComplete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = getUserId(ctx);
      return handleAsyncOperation(
        async () => toggleSessionComplete(ctx.db, userId, input.id),
        "toggle session completion",
        { userId, sessionId: input.id },
      );
    }),

  /**
   * Delete a session (only if it belongs to the authenticated user)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = getUserId(ctx);
      return handleAsyncOperation(
        async () => deleteSession(ctx.db, userId, input.id),
        "delete session",
        { userId, sessionId: input.id },
      );
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
      const userId = getUserId(ctx);
      return handleAsyncOperation(
        async () =>
          checkSessionConflicts(
            ctx.db,
            userId,
            input.startTime,
            input.endTime,
            input.excludeSessionId,
          ),
        "check session conflicts",
        {
          userId,
          startTime: input.startTime.toISOString(),
          endTime: input.endTime.toISOString(),
        },
      );
    }),

  /**
   * Get smart time slot suggestions based on repeating task patterns
   * Analyzes past sessions to detect patterns and suggests future slots
   * Improved algorithm considers availability, priority, and fatigue heuristics
   */
  suggest: protectedProcedure
    .input(
      z.object({
        startDate: z.coerce.date().optional(),
        lookAheadDays: z.number().int().min(1).max(30).optional().default(14),
        preferredTypes: z.array(z.enum(SESSION_TYPES)).optional(),
        minPriority: z.number().int().min(1).max(5).optional(),
        maxPriority: z.number().int().min(1).max(5).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = getUserId(ctx);
      return handleAsyncOperation(
        async () => suggestTimeSlots(ctx.db, userId, input),
        "suggest time slots",
        { userId },
      );
    }),

  /**
   * Accept a suggestion and create a session from it
   * Takes suggestion details and creates the session, optionally allowing field overrides
   */
  acceptSuggestion: protectedProcedure
    .input(
      z.object({
        suggestionId: z.string(), // ID for tracking which suggestion was accepted
        title: z.string().max(256),
        type: z.enum(SESSION_TYPES),
        startTime: z.coerce.date(),
        endTime: z.coerce.date(),
        priority: z.coerce.number().int().min(1).max(5),
        description: z.string().optional(),
        allowConflicts: z.boolean().optional().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = getUserId(ctx);
      const sessionData = {
        title: input.title,
        type: input.type,
        startTime: input.startTime,
        endTime: input.endTime,
        priority: input.priority,
        description: input.description,
        completed: false, // New sessions are not completed
        fromSuggestionId: input.suggestionId, // Track which suggestion this came from
      };

      return handleAsyncOperation(
        async () =>
          createSession(ctx.db, userId, sessionData, input.allowConflicts),
        "accept suggestion",
        {
          userId,
          suggestionId: input.suggestionId,
          allowConflicts: input.allowConflicts,
        },
      );
    }),
} satisfies TRPCRouterRecord;
