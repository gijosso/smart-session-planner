import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { CreateSessionSchema, SESSION_TYPES } from "@ssp/db/schema";

import { SESSION_LIMITS, SUGGESTION_INPUT_LIMITS } from "../constants/session";
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
import { protectedMutationProcedure, protectedProcedure } from "../trpc";
import { getUserId } from "../utils/context";
import { handleAsyncOperation } from "../utils/db-errors";

export const sessionRouter = {
  /**
   * Get sessions for today (timezone-aware)
   * Calculates "today" based on user's timezone preference
   * Supports pagination with limit and offset
   */
  today: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(1000).optional().default(100),
          offset: z.number().int().min(0).optional().default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = getUserId(ctx);
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
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(1000).optional().default(100),
          offset: z.number().int().min(0).optional().default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = getUserId(ctx);
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
  create: protectedMutationProcedure
    .input(
      CreateSessionSchema.extend({
        allowConflicts: z.boolean().optional().default(false),
      }).refine((data) => data.endTime > data.startTime, {
        message: "End time must be after start time",
        path: ["endTime"],
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
  update: protectedMutationProcedure
    .input(
      z
        .object({
          id: z.string(),
          title: z.string().max(SESSION_LIMITS.MAX_TITLE_LENGTH).optional(),
          type: z.enum(SESSION_TYPES).optional(),
          startTime: z.coerce.date().optional(),
          endTime: z.coerce.date().optional(),
          completed: z.boolean().optional(),
          priority: z.coerce
            .number()
            .int()
            .min(SESSION_LIMITS.MIN_PRIORITY)
            .max(SESSION_LIMITS.MAX_PRIORITY)
            .optional(),
          description: z.string().optional(),
          allowConflicts: z.boolean().optional().default(false),
        })
        .refine(
          (data) => {
            // Validate that at least one field is being updated
            const hasUpdates =
              data.title !== undefined ||
              data.type !== undefined ||
              data.startTime !== undefined ||
              data.endTime !== undefined ||
              data.completed !== undefined ||
              data.priority !== undefined ||
              data.description !== undefined;
            return hasUpdates;
          },
          {
            message: "At least one field must be provided for update",
            path: ["id"],
          },
        )
        .refine(
          (data) => {
            // If both startTime and endTime are provided, validate the range
            if (data.startTime && data.endTime) {
              return data.endTime > data.startTime;
            }
            return true;
          },
          {
            message: "End time must be after start time",
            path: ["endTime"],
          },
        ),
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
  toggleComplete: protectedMutationProcedure
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
  delete: protectedMutationProcedure
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
      z
        .object({
          startTime: z.coerce.date(),
          endTime: z.coerce.date(),
          excludeSessionId: z.string().optional(),
        })
        .refine((data) => data.endTime > data.startTime, {
          message: "End time must be after start time",
          path: ["endTime"],
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
        lookAheadDays: z
          .number()
          .int()
          .min(SUGGESTION_INPUT_LIMITS.MIN_LOOKAHEAD_DAYS)
          .max(SUGGESTION_INPUT_LIMITS.MAX_LOOKAHEAD_DAYS)
          .optional()
          .default(SUGGESTION_INPUT_LIMITS.DEFAULT_LOOKAHEAD_DAYS),
        preferredTypes: z.array(z.enum(SESSION_TYPES)).optional(),
        minPriority: z
          .number()
          .int()
          .min(SUGGESTION_INPUT_LIMITS.MIN_PRIORITY)
          .max(SUGGESTION_INPUT_LIMITS.MAX_PRIORITY)
          .optional(),
        maxPriority: z
          .number()
          .int()
          .min(SUGGESTION_INPUT_LIMITS.MIN_PRIORITY)
          .max(SUGGESTION_INPUT_LIMITS.MAX_PRIORITY)
          .optional(),
      }),
    )
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
  acceptSuggestion: protectedMutationProcedure
    .input(
      z
        .object({
          suggestionId: z.string(), // ID for tracking which suggestion was accepted
          title: z.string().max(SESSION_LIMITS.MAX_TITLE_LENGTH),
          type: z.enum(SESSION_TYPES),
          startTime: z.coerce.date(),
          endTime: z.coerce.date(),
          priority: z.coerce
            .number()
            .int()
            .min(SESSION_LIMITS.MIN_PRIORITY)
            .max(SESSION_LIMITS.MAX_PRIORITY),
          description: z.string().optional(),
          allowConflicts: z.boolean().optional().default(false),
        })
        .refine((data) => data.endTime > data.startTime, {
          message: "End time must be after start time",
          path: ["endTime"],
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
