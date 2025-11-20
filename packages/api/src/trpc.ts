/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1)
 * 2. You want to create a new middleware or type of procedure (see Part 3)
 *
 * tl;dr - this is where all the tRPC server stuff is created and plugged in.
 * The pieces you will need to use are documented accordingly near the end
 */

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z, ZodError } from "zod/v4";

import type { Auth } from "@ssp/auth";
import { eq, getUserTimezone } from "@ssp/db";
import { db } from "@ssp/db/client";
import { Profile } from "@ssp/db/schema";

import { TIMING_MIDDLEWARE } from "./constants/trpc";
import { logger } from "./utils/logger";
import { checkRateLimit } from "./utils/rate-limit";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */

interface TRPCContext {
  auth: Auth;
  session: Awaited<ReturnType<Auth["api"]["getSession"]>>;
  db: typeof db;
  timezone?: string; // User's timezone (only available for authenticated users)
}

export async function createTRPCContext(opts: {
  headers: Headers;
  auth: Auth;
}): Promise<TRPCContext> {
  const session = await opts.auth.api.getSession({
    headers: opts.headers,
  });
  return {
    auth: opts.auth,
    session,
    db,
  };
}

/**
 * 2. INITIALIZATION
 *
 * This is where the trpc api is initialized, connecting the context and
 * transformer
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      zodError:
        error.cause instanceof ZodError
          ? z.flattenError(error.cause as ZodError<Record<string, unknown>>)
          : null,
    },
  }),
});

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these
 * a lot in the /src/server/api/routers folder
 */

/**
 * This is how you create new routers and subrouters in your tRPC API
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter: typeof t.router = t.router;

/**
 * Middleware for timing procedure execution and adding an articifial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev
    const waitMs =
      Math.floor(Math.random() * TIMING_MIDDLEWARE.DELAY_RANGE_MS) +
      TIMING_MIDDLEWARE.MIN_DELAY_MS;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  const duration = end - start;
  logger.info(`tRPC procedure executed`, { path, durationMs: duration });

  return result;
});

/**
 * Public (unauthed) procedure
 *
 * This is the base piece you use to build new queries and mutations on your
 * tRPC API. It does not guarantee that a user querying is authorized, but you
 * can still access user session data if they are logged in
 */
export const publicProcedure: typeof t.procedure =
  t.procedure.use(timingMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 * Also fetches and caches the user's timezone in context for quick lookup.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure: typeof t.procedure = t.procedure
  .use(timingMiddleware)
  .use(async ({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    // Fetch user's timezone once and cache it in context
    // This avoids repeated database queries for timezone lookups
    // Timezone is guaranteed to be set after this middleware
    let timezone = ctx.timezone;
    if (!timezone) {
      const profile = await db.query.Profile.findFirst({
        where: eq(Profile.userId, ctx.session.user.id),
      });
      timezone = getUserTimezone(profile?.timezone ?? null);
    }

    return next({
      ctx: {
        // infers the `session` as non-nullable
        session: { ...ctx.session, user: ctx.session.user },
        // Add timezone to context for quick lookup (guaranteed to be set)
        timezone, // TypeScript now knows this is string, not string | undefined
      },
    });
  });

/**
 * Rate limiting middleware for mutations
 * Prevents abuse by limiting the number of mutations per user per time window
 */
const rateLimitMiddleware = t.middleware(async ({ ctx, next }) => {
  // Only apply rate limiting to authenticated users
  if (ctx.session?.user) {
    const userId = ctx.session.user.id;
    const rateLimitResult = checkRateLimit(userId);

    if (rateLimitResult.exceeded) {
      const resetSeconds = Math.ceil(
        (rateLimitResult.resetAt - Date.now()) / 1000,
      );
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Rate limit exceeded. Please try again in ${resetSeconds} seconds.`,
      });
    }
  }

  return next();
});

/**
 * Protected procedure with rate limiting for mutations
 * Use this for mutation endpoints to prevent abuse
 */
export const protectedMutationProcedure: typeof t.procedure = t.procedure
  .use(timingMiddleware)
  .use(rateLimitMiddleware)
  .use(async ({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    // Fetch user's timezone once and cache it in context
    let timezone = ctx.timezone;
    if (!timezone) {
      const profile = await db.query.Profile.findFirst({
        where: eq(Profile.userId, ctx.session.user.id),
      });
      timezone = getUserTimezone(profile?.timezone ?? null);
    }

    return next({
      ctx: {
        session: { ...ctx.session, user: ctx.session.user },
        timezone,
      },
    });
  });
