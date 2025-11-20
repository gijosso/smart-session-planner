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

import {
  REQUEST_LIMITS,
  REQUEST_TIMEOUT,
  TIMING_MIDDLEWARE,
} from "./constants/trpc";
import { isDevelopment } from "./utils/error/codes";
import { logger } from "./utils/logger";
import { checkRateLimit } from "./utils/rate-limit";
import { getCachedTimezone, setCachedTimezone } from "./utils/timezone-cache";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
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
  errorFormatter: ({ shape, error }) => {
    const isDev = isDevelopment();

    // In production, remove stack traces and sanitize error details
    const sanitizedShape = {
      ...shape,
      // Remove stack trace in production
      stack: isDev ? (shape as { stack?: string }).stack : undefined,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError
            ? z.flattenError(error.cause as ZodError<Record<string, unknown>>)
            : null,
        // Remove nested error details in production
        ...(isDev ? {} : { cause: undefined }),
      },
    };

    return sanitizedShape;
  },
});

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these
 * a lot in the /src/server/api/routers folder
 */

/**
 * This is how you create new routers and subrouters in your tRPC API
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
 * Middleware to enforce request size limits
 * Prevents abuse by limiting the size of input data
 */
const requestSizeLimitMiddleware = t.middleware(
  async ({ input, next, path, type }) => {
    if (input) {
      try {
        // Estimate input size by stringifying (approximate)
        const inputString = JSON.stringify(input);
        const inputSize = inputString.length;

        if (inputSize > REQUEST_LIMITS.MAX_INPUT_SIZE_CHARS) {
          logger.warn("Request size limit exceeded", {
            path,
            type,
            inputSize,
            maxSize: REQUEST_LIMITS.MAX_INPUT_SIZE_CHARS,
          });
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Request payload is too large. Maximum size is ${REQUEST_LIMITS.MAX_INPUT_SIZE_CHARS} characters.`,
          });
        }
      } catch (error) {
        // If stringification fails, it might be due to circular references
        // Log but don't fail - let the procedure handle it
        if (error instanceof TRPCError) {
          throw error;
        }
        logger.warn("Failed to check request size", {
          path,
          type,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return next();
  },
);

/**
 * Middleware to enforce request timeouts
 * Prevents long-running requests from hanging
 */
const timeoutMiddleware = t.middleware(async ({ next, path, type }) => {
  const timeoutMs =
    type === "mutation"
      ? REQUEST_TIMEOUT.MUTATION_TIMEOUT_MS
      : REQUEST_TIMEOUT.QUERY_TIMEOUT_MS;

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      logger.warn("Request timeout exceeded", {
        path,
        type,
        timeoutMs,
      });
      reject(
        new TRPCError({
          code: "TIMEOUT",
          message: `Request timed out after ${timeoutMs}ms. Please try again or contact support if the problem persists.`,
        }),
      );
    }, timeoutMs);
  });

  try {
    // Race between the actual operation and the timeout
    return await Promise.race([next(), timeoutPromise]);
  } catch (error) {
    // Re-throw TRPCError (including timeout errors)
    if (error instanceof TRPCError) {
      throw error;
    }
    // Wrap unexpected errors
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred during request processing.",
      cause: isDevelopment() ? error : undefined,
    });
  }
});

/**
 * Public (unauthed) procedure
 *
 * This is the base piece you use to build new queries and mutations on your
 * tRPC API. It does not guarantee that a user querying is authorized, but you
 * can still access user session data if they are logged in
 */
export const publicProcedure: typeof t.procedure = t.procedure
  .use(requestSizeLimitMiddleware)
  .use(timeoutMiddleware)
  .use(timingMiddleware);

/**
 * Middleware to ensure user is authenticated and add timezone to context
 * This combines authentication check with timezone fetching
 * Uses in-memory cache to avoid repeated database queries for timezone lookups
 */
const authAndTimezoneMiddleware = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  // Check cache first, then database if not cached
  // Timezone is guaranteed to be set after this middleware
  let timezone = ctx.timezone;
  if (!timezone) {
    const userId = ctx.session.user.id;

    // Try cache first
    const cachedTimezone = getCachedTimezone(userId);
    if (cachedTimezone) {
      timezone = cachedTimezone;
    } else {
      // Cache miss - fetch from database
      const profile = await db.query.Profile.findFirst({
        where: eq(Profile.userId, userId),
      });
      timezone = getUserTimezone(profile?.timezone ?? null);

      // Cache the result for future requests
      setCachedTimezone(userId, timezone);
    }
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
export const protectedProcedure: typeof t.procedure = t.procedure
  .use(requestSizeLimitMiddleware)
  .use(timeoutMiddleware)
  .use(timingMiddleware)
  .use(rateLimitMiddleware)
  .use(authAndTimezoneMiddleware);
