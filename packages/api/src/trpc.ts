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

import { PERFORMANCE_CONSTANTS } from "./utils/constants";
import { logger } from "./utils/logger";
import { runWithRequestContext } from "./utils/tracking/request-context";
import { extractRequestIdFromHeaders } from "./utils/tracking/request-id";

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
  headers: Headers;
  userTimezone?: string; // Cached user timezone (set by timezoneCacheMiddleware for protected procedures)
  requestId: string; // Unique request ID for tracing
}

export async function createTRPCContext(opts: {
  headers: Headers;
  auth: Auth;
}): Promise<TRPCContext> {
  const requestId = extractRequestIdFromHeaders(opts.headers);

  // Set up AsyncLocalStorage context for this request
  // This allows helpers to access requestId without passing it explicitly
  return runWithRequestContext({ requestId }, async () => {
    const session = await opts.auth.api.getSession({
      headers: opts.headers,
    });
    return {
      auth: opts.auth,
      session,
      db,
      headers: opts.headers,
      requestId,
    };
  });
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
 */
export const createTRPCRouter: typeof t.router = t.router;

/**
 * Middleware for request timeout handling
 * Prevents long-running requests from hanging indefinitely
 *
 * Uses Promise.race to reject requests that exceed the timeout duration.
 * Note: This prevents clients from waiting indefinitely, but database operations
 * may continue running in the background. For true cancellation, database-level
 * query timeouts should be configured. This is an acceptable tradeoff for now.
 */
const timeoutMiddleware = t.middleware(async ({ next, path, ctx }) => {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeoutMs: number = PERFORMANCE_CONSTANTS.REQUEST_TIMEOUT_MS;

    const result = await Promise.race([
      next(),
      new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          logger.warn("Request timeout exceeded", {
            path,
            timeoutMs,
            requestId: ctx.requestId,
          });
          reject(
            new TRPCError({
              code: "TIMEOUT",
              message: "Request timeout. Please try again.",
            }),
          );
        }, timeoutMs);
      }),
    ]);

    // Clear timeout if request completed successfully
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
    return result;
  } catch (error) {
    // Clear timeout on error
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
    throw error;
  }
});

/**
 * Middleware for timing procedure execution
 * Logs execution time for all procedures to help identify performance issues
 *
 * Note: Artificial delays are removed as they can mask real performance problems
 * and make debugging harder. Use actual network throttling tools if needed.
 */
const timingMiddleware = t.middleware(async ({ next, path, ctx }) => {
  const start = Date.now();

  const result = await next();

  const end = Date.now();
  const duration = end - start;

  // Only log slow queries in production, or all queries in development
  if (
    t._config.isDev ||
    duration > PERFORMANCE_CONSTANTS.SLOW_QUERY_THRESHOLD_MS
  ) {
    logger.info(`TRPC procedure executed`, {
      path,
      durationMs: duration,
      requestId: ctx.requestId,
    });
  }

  return result;
});

/**
 * Public (unauthed) procedure
 *
 * This is the base piece you use to build new queries and mutations on your
 * tRPC API. It does not guarantee that a user querying is authorized, but you
 * can still access user session data if they are logged in
 */
export const publicProcedure: typeof t.procedure = t.procedure
  .use(timeoutMiddleware)
  .use(timingMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 */
/**
 * Middleware to cache user timezone in context
 * Fetches user timezone once per request and caches it in context
 * This ensures timezone is only fetched once per request, even if multiple procedures need it
 *
 * Note: Assumes session.user is already verified (protectedProcedure should ensure this)
 */
const timezoneCacheMiddleware = t.middleware(async ({ ctx, next }) => {
  // Session is guaranteed to exist for protected procedures
  // If session.user is null, this indicates a bug in the auth setup
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  // Check if timezone is already cached in context (from a previous middleware call in the same request)
  // This prevents multiple DB queries for the same user in a single request
  if (ctx.userTimezone) {
    return next({
      ctx: {
        session: { ...ctx.session, user: ctx.session.user },
        userTimezone: ctx.userTimezone, // Already cached, reuse it
      },
    });
  }

  // Fetch timezone from database (only once per request)
  const profile = await db.query.Profile.findFirst({
    where: eq(Profile.userId, ctx.session.user.id),
  });
  const userTimezone = getUserTimezone(profile?.timezone ?? null);

  // Cache timezone in context for subsequent middleware/handlers in this request
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
      userTimezone, // Cache for rest of request (guaranteed non-null from getUserTimezone)
    },
  });
});

export const protectedProcedure = t.procedure
  .use(timeoutMiddleware)
  .use(timingMiddleware)
  .use(timezoneCacheMiddleware);
