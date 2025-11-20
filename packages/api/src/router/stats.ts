import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";

import { getSessionStats } from "../helpers/stats";
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

export const statsRouter = {
  /**
   * Get session statistics for the authenticated user
   * Returns total, completed, pending counts and breakdown by type
   */
  sessions: protectedProcedure.query(async ({ ctx }) => {
    const userId = getUserId(ctx);
    return handleAsyncOperation(
      async () => getSessionStats(ctx.db, userId),
      "get session stats",
      { userId },
    );
  }),
} satisfies TRPCRouterRecord;
