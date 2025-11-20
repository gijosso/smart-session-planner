import { TRPCError } from "@trpc/server";

/**
 * Extract userId from tRPC context
 * protectedProcedure guarantees session.user exists, but this provides type safety
 */
export function getUserId(ctx: {
  session: { user: { id: string } } | null;
}): string {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return ctx.session.user.id;
}

/**
 * Get user's timezone from context (if available) or fallback to database lookup
 * protectedProcedure guarantees timezone is available in context, but this provides a fallback
 * for cases where context timezone might not be set (e.g., in helper functions called directly)
 */
export async function getUserTimezoneFromContext(
  ctx: { timezone?: string; db: typeof import("@ssp/db/client").db },
  userId: string,
): Promise<string> {
  // If timezone is already in context (from protectedProcedure middleware), use it
  if (ctx.timezone) {
    return ctx.timezone;
  }

  // Fallback to database lookup (for cases where context doesn't have timezone)
  const { eq } = await import("@ssp/db");
  const { getUserTimezone } = await import("@ssp/db");
  const { Profile } = await import("@ssp/db/schema");

  const profile = await ctx.db.query.Profile.findFirst({
    where: eq(Profile.userId, userId),
  });
  return getUserTimezone(profile?.timezone ?? null);
}

