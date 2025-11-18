import { randomBytes } from "crypto";
import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { createUserInDatabase } from "../helpers/auth";
import {
  createSupabaseUser,
  getUserSession,
  refreshUserToken,
  signInUser,
} from "../helpers/supabase";
import { publicProcedure } from "../trpc";

export const authRouter = {
  getSession: publicProcedure.query(({ ctx }) => {
    return getUserSession(ctx.session);
  }),
  signUp: publicProcedure
    .input(
      z.object({
        email: z.email(),
        password: z.string().min(6),
        timezone: z.string().max(50).optional(), // IANA timezone string (e.g., "America/New_York")
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const createdUser = await createSupabaseUser(ctx.auth, {
        email: input.email,
        password: input.password,
        emailConfirm: true,
      });

      await createUserInDatabase(ctx.db, createdUser, {
        timezone: input.timezone ?? null,
      });

      return await signInUser(ctx.auth, input.email, input.password);
    }),
  signIn: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await signInUser(ctx.auth, input.email, input.password);
    }),
  signUpAnonymously: publicProcedure
    .input(
      z
        .object({
          timezone: z.string().max(50).optional(), // IANA timezone string (e.g., "America/New_York")
        })
        .optional(),
    )
    .mutation(async ({ ctx, input = {} }) => {
      const anonymousEmail = `anonymous_${randomBytes(8).toString("hex")}@anonymous.local`;
      const anonymousPassword = randomBytes(32).toString("hex");

      const createdUser = await createSupabaseUser(ctx.auth, {
        email: anonymousEmail,
        password: anonymousPassword,
        emailConfirm: true,
        userMetadata: {
          name: "Anonymous User",
          anonymous: true,
        },
      });

      await createUserInDatabase(ctx.db, createdUser, {
        timezone: input.timezone ?? null,
        defaultName: "Anonymous User",
      });

      return await signInUser(ctx.auth, anonymousEmail, anonymousPassword);
    }),
  refreshToken: publicProcedure
    .input(
      z.object({
        refreshToken: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await refreshUserToken(ctx.auth, input.refreshToken);
    }),
} satisfies TRPCRouterRecord;
