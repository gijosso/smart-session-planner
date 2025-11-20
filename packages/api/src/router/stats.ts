import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";

import { getSessionStats } from "../helpers/stats";
import { protectedProcedure } from "../trpc";

export const statsRouter = {
  /**
   * Get session statistics for the authenticated user
   * Returns total, completed, pending counts and breakdown by type
   */
  sessions: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return getSessionStats(ctx.db, ctx.session.user.id);
  }),
} satisfies TRPCRouterRecord;
