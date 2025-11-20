import type { TRPCRouterRecord } from "@trpc/server";

import {
  acceptSuggestionInputSchema,
  checkConflictsInputSchema,
  createSessionInputSchema,
  paginationInputSchema,
  sessionIdInputSchema,
  suggestTimeSlotsInputSchema,
  updateSessionInputSchema,
} from "@ssp/validators";

import {
  checkSessionConflicts,
  createSession,
  deleteSession,
  getSessionById,
  getSessionsToday,
  getSessionsWeek,
  toggleSessionComplete,
  updateSession,
} from "../helpers/session";
import { suggestTimeSlots } from "../helpers/suggestions";
import { protectedProcedure } from "../trpc";
import { getUserId } from "../utils/context";
import { handleAsyncOperation } from "../utils/error";

export const sessionRouter = {
  /**
   * Get sessions for today (timezone-aware)
   * Calculates "today" based on user's timezone preference
   * Supports pagination with limit and offset
   */
  today: protectedProcedure
    .input(paginationInputSchema)
    .query(async ({ ctx, input }) => {
      const userId = getUserId(ctx);
      // Input validation is handled by Zod schema (min 1, max 1000 for limit, min 0 for offset)
      // Defaults are applied by the schema if input is undefined
      const limit = input?.limit ?? 100;
      const offset = input?.offset ?? 0;
      // Timezone is already available in context from protectedProcedure middleware
      return handleAsyncOperation(
        async () =>
          getSessionsToday(ctx.db, userId, ctx.timezone, limit, offset),
        "get sessions today",
        { userId, limit, offset },
      );
    }),

  /**
   * Get sessions for the current week (timezone-aware)
   * Calculates the week (Sunday to Saturday) based on user's timezone preference
   * Supports pagination with limit and offset
   */
  week: protectedProcedure
    .input(paginationInputSchema)
    .query(async ({ ctx, input }) => {
      const userId = getUserId(ctx);
      // Input validation is handled by Zod schema (min 1, max 1000 for limit, min 0 for offset)
      // Defaults are applied by the schema if input is undefined
      const limit = input?.limit ?? 100;
      const offset = input?.offset ?? 0;
      // Timezone is already available in context from protectedProcedure middleware
      return handleAsyncOperation(
        async () =>
          getSessionsWeek(ctx.db, userId, ctx.timezone, limit, offset),
        "get sessions week",
        { userId, limit, offset },
      );
    }),

  /**
   * Get a session by ID (only if it belongs to the authenticated user)
   */
  byId: protectedProcedure
    .input(sessionIdInputSchema)
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
    .input(createSessionInputSchema)
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
    .input(updateSessionInputSchema)
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
    .input(sessionIdInputSchema)
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
    .input(sessionIdInputSchema)
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
    .input(checkConflictsInputSchema)
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
    .input(suggestTimeSlotsInputSchema)
    .query(async ({ ctx, input }) => {
      const userId = getUserId(ctx);
      // Timezone is already available in context from protectedProcedure middleware
      return handleAsyncOperation(
        async () => suggestTimeSlots(ctx.db, userId, input, ctx.timezone),
        "suggest time slots",
        { userId },
      );
    }),

  /**
   * Accept a suggestion and create a session from it
   * Takes suggestion details and creates the session, optionally allowing field overrides
   */
  acceptSuggestion: protectedProcedure
    .input(acceptSuggestionInputSchema)
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
