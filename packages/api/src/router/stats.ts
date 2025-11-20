import type { TRPCRouterRecord } from "@trpc/server";

import { getSessionStats } from "../helpers/stats";
import { protectedProcedure } from "../trpc";
import { getTimezone, getUserId } from "../utils/context";
import { handleAsyncOperation } from "../utils/error";

export const statsRouter = {
  /**
   * Get session statistics for the authenticated user
   * Returns total, completed, pending counts and breakdown by type
   * Includes today and week stats (timezone-aware)
   */
  sessions: protectedProcedure.query(async ({ ctx }) => {
    const userId = getUserId(ctx);
    const timezone = getTimezone(ctx);
    return handleAsyncOperation(
      async () => getSessionStats(ctx.db, userId, timezone),
      "get session stats",
      { userId },
    );
  }),
} satisfies TRPCRouterRecord;
