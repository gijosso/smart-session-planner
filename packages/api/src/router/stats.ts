import type { TRPCRouterRecord } from "@trpc/server";

import { getSessionStats } from "../helpers/stats";
import { protectedProcedure } from "../trpc";

/**
 * Stats router
 * Handles session statistics and analytics
 */
export const statsRouter = {
  /**
   * Get session statistics for the authenticated user
   * Returns total, completed, pending counts, breakdown by type, and streak information
   */
  sessions: protectedProcedure.query(async ({ ctx }) => {
    return await getSessionStats(ctx.db, ctx.session.user.id);
  }),
} satisfies TRPCRouterRecord;
