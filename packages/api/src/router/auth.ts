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
import { handleAuthError, handleDatabaseError } from "../utils/db-errors";

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
      try {
        const createdUser = await createSupabaseUser(ctx.auth, {
          email: input.email,
          password: input.password,
          emailConfirm: true,
        });

        try {
          await createUserInDatabase(ctx.db, createdUser, {
            timezone: input.timezone ?? null,
          });
        } catch (error) {
          // Database errors from createUserInDatabase
          handleDatabaseError(error, "create user in database", {
            userId: createdUser.id,
            email: input.email,
          });
        }

        try {
          return await signInUser(ctx.auth, input.email, input.password);
        } catch (error) {
          // Auth errors from signInUser
          handleAuthError(error, "sign in after signup");
        }
      } catch (error) {
        // Auth errors from createSupabaseUser
        handleAuthError(error, "sign up");
      }
    }),
  signIn: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await signInUser(ctx.auth, input.email, input.password);
      } catch (error) {
        handleAuthError(error, "sign in");
      }
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
      try {
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

        try {
          await createUserInDatabase(ctx.db, createdUser, {
            timezone: input.timezone ?? null,
            defaultName: "Anonymous User",
          });
        } catch (error) {
          // Database errors from createUserInDatabase
          handleDatabaseError(error, "create anonymous user in database", {
            userId: createdUser.id,
          });
        }

        try {
          return await signInUser(ctx.auth, anonymousEmail, anonymousPassword);
        } catch (error) {
          // Auth errors from signInUser
          handleAuthError(error, "sign in anonymous user");
        }
      } catch (error) {
        // Auth errors from createSupabaseUser
        handleAuthError(error, "sign up anonymously");
      }
    }),
  refreshToken: publicProcedure
    .input(
      z.object({
        refreshToken: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await refreshUserToken(ctx.auth, input.refreshToken);
      } catch (error) {
        handleAuthError(error, "refresh token");
      }
    }),
} satisfies TRPCRouterRecord;
