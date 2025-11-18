import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import {
  and,
  desc,
  eq,
  getEndOfDayInTimezone,
  getStartOfDayInTimezone,
  getUserTimezone,
  gte,
  lt,
} from "@ssp/db";
import { CreateSessionSchema, Profile, Session } from "@ssp/db/schema";

import { protectedProcedure } from "../trpc";

export const sessionRouter = {
  /**
   * Get all sessions for the authenticated user
   */
  all: protectedProcedure.query(({ ctx }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return ctx.db.query.Session.findMany({
      where: eq(Session.userId, ctx.session.user.id),
      orderBy: desc(Session.startTime),
    });
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

      // Get user's profile to retrieve timezone preference
      const profile = await ctx.db.query.Profile.findFirst({
        where: eq(Profile.userId, ctx.session.user.id),
      });

      const userTimezone = getUserTimezone(profile?.timezone ?? null);
      // Input dates are already Date objects (z.coerce.date() handles conversion)
      const startDate = input.startDate;
      const endDate = input.endDate;

      // Convert date boundaries to UTC based on user's timezone
      const startUTC = getStartOfDayInTimezone(startDate, userTimezone);
      const endUTC = getEndOfDayInTimezone(endDate, userTimezone);

      return ctx.db.query.Session.findMany({
        where: and(
          eq(Session.userId, ctx.session.user.id),
          gte(Session.startTime, startUTC),
          lt(Session.startTime, endUTC), // Use < instead of <= for end boundary
        ),
        orderBy: desc(Session.startTime),
      });
    }),

  /**
   * Get sessions for today (timezone-aware)
   * Calculates "today" based on user's timezone preference
   */
  today: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    // Get user's profile to retrieve timezone preference
    const profile = await ctx.db.query.Profile.findFirst({
      where: eq(Profile.userId, ctx.session.user.id),
    });

    // Get user's timezone (default to UTC)
    const userTimezone = getUserTimezone(profile?.timezone ?? null);

    const now = new Date();
    // Calculate start and end of "today" in user's timezone, converted to UTC
    const startOfTodayUTC = getStartOfDayInTimezone(now, userTimezone);
    const endOfTodayUTC = getEndOfDayInTimezone(now, userTimezone);

    // Query database using UTC boundaries
    return ctx.db.query.Session.findMany({
      where: and(
        eq(Session.userId, ctx.session.user.id),
        gte(Session.startTime, startOfTodayUTC),
        lt(Session.startTime, endOfTodayUTC), // Use < instead of <= for end boundary
      ),
      orderBy: [Session.startTime],
    });
  }),

  /**
   * Get a session by ID (only if it belongs to the authenticated user)
   */
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      return ctx.db.query.Session.findFirst({
        where: and(
          eq(Session.id, input.id),
          eq(Session.userId, ctx.session.user.id),
        ),
      });
    }),

  /**
   * Create a new session
   */
  create: protectedProcedure
    .input(CreateSessionSchema)
    .mutation(({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      return ctx.db.insert(Session).values({
        ...input,
        userId: ctx.session.user.id,
      });
    }),

  /**
   * Update a session (only if it belongs to the authenticated user)
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().max(256).optional(),
        type: z.string().max(100).optional(),
        startTime: z.coerce.date().optional(),
        endTime: z.coerce.date().optional(),
        completed: z.boolean().optional(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const { id, ...updates } = input;

      // Verify the session belongs to the user
      const existingSession = await ctx.db.query.Session.findFirst({
        where: and(eq(Session.id, id), eq(Session.userId, ctx.session.user.id)),
      });

      if (!existingSession) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found or access denied",
        });
      }

      return ctx.db.update(Session).set(updates).where(eq(Session.id, id));
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
      // Verify the session belongs to the user
      const existingSession = await ctx.db.query.Session.findFirst({
        where: and(
          eq(Session.id, input.id),
          eq(Session.userId, ctx.session.user.id),
        ),
      });

      if (!existingSession) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found or access denied",
        });
      }

      return ctx.db
        .update(Session)
        .set({ completed: !existingSession.completed })
        .where(eq(Session.id, input.id));
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
      // Verify the session belongs to the user
      const existingSession = await ctx.db.query.Session.findFirst({
        where: and(
          eq(Session.id, input.id),
          eq(Session.userId, ctx.session.user.id),
        ),
      });

      if (!existingSession) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found or access denied",
        });
      }

      return ctx.db.delete(Session).where(eq(Session.id, input.id));
    }),
} satisfies TRPCRouterRecord;
