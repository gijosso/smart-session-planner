import type { TRPCRouterRecord } from "@trpc/server";

import { getSessionStats } from "../helpers/stats";
import { protectedProcedure } from "../trpc";
import { getUserId } from "../utils/context";
import { handleAsyncOperation } from "../utils/db-errors";

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
