import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { CreateSessionSchema, SESSION_TYPES } from "@ssp/db/schema";
import { optionalDateSchema, sanitizeString } from "@ssp/validators";

import { checkSessionConflicts } from "../helpers/session/conflicts";
import {
  createSession,
  deleteSession,
  toggleSessionComplete,
  updateSession,
} from "../helpers/session/mutations";
import {
  getAllSessions,
  getAllSessionsCursor,
  getSessionById,
  getSessionsByDateRange,
  getSessionsToday,
  getSessionsWeek,
  getUpcomingSessions,
} from "../helpers/session/queries";
import { suggestTimeSlots } from "../helpers/suggestions/queries";
import { protectedProcedure } from "../trpc";
import { validateRequestSize } from "../utils/middleware";
import { rateLimitMutations } from "../utils/rate-limit";
import {
  cursorPaginationSchema,
  paginationSchema,
  sessionIdSchema,
  suggestionInputSchema,
  validatedDateRangeSchema,
  validatedTimeRangeSchema,
} from "../utils/validators/session";
import {
  validateTimeRange,
  validateTimeRangeWithExisting,
} from "../utils/validators/time-range";

/**
 * Session router
 * Handles CRUD operations for user sessions and session-related queries
 */
export const sessionRouter = {
  /**
   * Get all sessions for the authenticated user
   * Returns all non-deleted sessions ordered by start time (descending)
   * Supports pagination via limit and offset
   *
   * Note: For better performance on large datasets, use `allCursor` instead.
   */
  all: protectedProcedure
    .input(paginationSchema)
    .query(async ({ ctx, input }) => {
      return await getAllSessions(ctx.db, ctx.session.user.id, {
        limit: input?.limit,
        offset: input?.offset,
      });
    }),

  /**
   * Get all sessions using cursor-based pagination (more efficient)
   * Returns all non-deleted sessions ordered by start time (descending)
   * Supports pagination via limit and cursor (ISO datetime string)
   *
   * Cursor-based pagination is more efficient than offset-based because:
   * - No need to scan skipped rows
   * - Consistent results even if data changes between requests
   * - Better performance on large datasets
   *
   * Use the `nextCursor` from the response as the `cursor` parameter for the next page.
   */
  allCursor: protectedProcedure
    .input(cursorPaginationSchema)
    .query(async ({ ctx, input }) => {
      const pagination = input ?? { limit: undefined, cursor: undefined };
      return await getAllSessionsCursor(ctx.db, ctx.session.user.id, {
        limit: pagination.limit,
        cursor: pagination.cursor,
      });
    }),

  /**
   * Get sessions for a specific date range (timezone-aware)
   * Accepts dates as ISO strings or Date objects. Dates are interpreted in user's timezone.
   * Returns sessions where startTime is within the range [startDate, endDate)
   */
  byDateRange: protectedProcedure
    .input(validatedDateRangeSchema)
    .query(async ({ ctx, input }) => {
      // userTimezone is guaranteed by timezoneCacheMiddleware
      return await getSessionsByDateRange(
        ctx.db,
        ctx.session.user.id,
        input.startDate,
        input.endDate,
        ctx.userTimezone,
      );
    }),

  /**
   * Get sessions for today (timezone-aware)
   * Calculates "today" based on user's timezone preference
   */
  today: protectedProcedure.query(async ({ ctx }) => {
    // userTimezone is guaranteed by timezoneCacheMiddleware
    return await getSessionsToday(
      ctx.db,
      ctx.session.user.id,
      ctx.userTimezone,
    );
  }),

  /**
   * Get sessions for the current week (timezone-aware)
   * Calculates the week (Sunday to Saturday) based on user's timezone preference
   */
  week: protectedProcedure.query(async ({ ctx }) => {
    // userTimezone is guaranteed by timezoneCacheMiddleware
    return await getSessionsWeek(ctx.db, ctx.session.user.id, ctx.userTimezone);
  }),

  /**
   * Get all upcoming (future) sessions for the authenticated user
   */
  upcoming: protectedProcedure.query(async ({ ctx }) => {
    return await getUpcomingSessions(ctx.db, ctx.session.user.id);
  }),

  /**
   * Get a session by ID (only if it belongs to the authenticated user)
   */
  byId: protectedProcedure
    .input(z.object({ id: sessionIdSchema }))
    .query(async ({ ctx, input }) => {
      return await getSessionById(ctx.db, ctx.session.user.id, input.id);
    }),

  /**
   * Create a new session
   * Optionally allows conflicts (default: false - conflicts will throw error)
   */
  create: protectedProcedure
    .input(
      CreateSessionSchema.safeExtend({
        allowConflicts: z.boolean().optional().default(false),
      }).transform((data) => ({
        ...data,
        title: sanitizeString(data.title, 256),
        description: data.description
          ? sanitizeString(data.description, 1000)
          : undefined,
      })),
    )
    .mutation(async ({ ctx, input }) => {
      validateRequestSize(ctx.headers.get("content-length"), true);
      rateLimitMutations(ctx.headers);
      const { allowConflicts, ...sessionInput } = input;
      return await createSession(
        ctx.db,
        ctx.session.user.id,
        sessionInput,
        allowConflicts,
      );
    }),

  /**
   * Update a session (only if it belongs to the authenticated user)
   * Optionally allows conflicts (default: false - conflicts will throw error)
   */
  update: protectedProcedure
    .input(
      z
        .object({
          id: sessionIdSchema,
          title: z
            .string()
            .max(256)
            .optional()
            .transform((val) => (val ? sanitizeString(val, 256) : undefined)),
          type: z.enum(SESSION_TYPES).optional(),
          startTime: optionalDateSchema,
          endTime: optionalDateSchema,
          completed: z.boolean().optional(),
          priority: z.coerce.number().int().min(1).max(5).optional(),
          description: z
            .string()
            .optional()
            .transform((val) => (val ? sanitizeString(val, 1000) : undefined)),
          allowConflicts: z.boolean().optional().default(false),
        })
        .refine(
          (data) => {
            const {
              id: _id,
              allowConflicts: _allowConflicts,
              ...updates
            } = data;
            return Object.keys(updates).length > 0;
          },
          {
            message: "At least one field must be provided to update",
          },
        )
        .refine(
          (data) => {
            // Early validation at router level for better error messages
            // Detailed validation happens in updateSession helper
            if (data.startTime && data.endTime) {
              if (
                !(data.startTime instanceof Date) ||
                isNaN(data.startTime.getTime()) ||
                !(data.endTime instanceof Date) ||
                isNaN(data.endTime.getTime())
              ) {
                return false;
              }
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
      validateRequestSize(ctx.headers.get("content-length"), true);
      rateLimitMutations(ctx.headers);
      const { id, allowConflicts, ...updates } = input;
      return await updateSession(
        ctx.db,
        ctx.session.user.id,
        id,
        updates,
        allowConflicts,
      );
    }),

  /**
   * Toggle completion status of a session
   * Sets completedAt timestamp when completing, clears it when uncompleting
   */
  toggleComplete: protectedProcedure
    .input(z.object({ id: sessionIdSchema }))
    .mutation(async ({ ctx, input }) => {
      validateRequestSize(ctx.headers.get("content-length"), true);
      rateLimitMutations(ctx.headers);
      return await toggleSessionComplete(ctx.db, ctx.session.user.id, input.id);
    }),

  /**
   * Delete a session (only if it belongs to the authenticated user)
   * Performs a soft delete by setting deletedAt timestamp
   */
  delete: protectedProcedure
    .input(z.object({ id: sessionIdSchema }))
    .mutation(async ({ ctx, input }) => {
      validateRequestSize(ctx.headers.get("content-length"), true);
      rateLimitMutations(ctx.headers);
      return await deleteSession(ctx.db, ctx.session.user.id, input.id);
    }),

  /**
   * Check if a time range conflicts with existing sessions
   * Returns array of conflicting sessions (empty if no conflicts)
   * Only checks non-completed, non-deleted sessions
   */
  checkConflicts: protectedProcedure
    .input(
      validatedTimeRangeSchema.safeExtend({
        excludeSessionId: sessionIdSchema.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Validate that excludeSessionId belongs to the user (security check)
      if (input.excludeSessionId) {
        // getSessionById throws if not found or doesn't belong to user
        // This ensures excludeSessionId can only reference user's own sessions
        await getSessionById(
          ctx.db,
          ctx.session.user.id,
          input.excludeSessionId,
        );
      }

      return await checkSessionConflicts(
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
   * Returns up to 10 suggestions sorted by score (highest first)
   */
  suggest: protectedProcedure
    .input(suggestionInputSchema)
    .query(async ({ ctx, input }) => {
      // userTimezone is guaranteed by timezoneCacheMiddleware
      return await suggestTimeSlots(
        ctx.db,
        ctx.session.user.id,
        input,
        ctx.userTimezone,
      );
    }),
} satisfies TRPCRouterRecord;
