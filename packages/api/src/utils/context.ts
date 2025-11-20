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

