import { randomBytes } from "crypto";
import type { TRPCRouterRecord } from "@trpc/server";

import {
  refreshTokenInputSchema,
  signUpAnonymouslyInputSchema,
} from "@ssp/validators";

import { ANONYMOUS_USER } from "../constants/auth";
import { createUserInDatabase } from "../helpers/auth";
import {
  createSupabaseUser,
  getUserSession,
  refreshUserToken,
  signInUser,
} from "../helpers/supabase";
import { publicProcedure } from "../trpc";
import { handleAuthError, handleDatabaseError } from "../utils/error";

export const authRouter = {
  getSession: publicProcedure.query(({ ctx }) => {
    return getUserSession(ctx.session);
  }),
  signUpAnonymously: publicProcedure
    .input(signUpAnonymouslyInputSchema)
    .mutation(async ({ ctx, input = {} }) => {
      const anonymousEmail = `${ANONYMOUS_USER.EMAIL_PREFIX}${randomBytes(ANONYMOUS_USER.EMAIL_RANDOM_BYTES).toString("hex")}${ANONYMOUS_USER.EMAIL_DOMAIN}`;
      const anonymousPassword = randomBytes(
        ANONYMOUS_USER.PASSWORD_RANDOM_BYTES,
      ).toString("hex");

      // Create user in Supabase Auth
      let createdUser: NonNullable<
        Awaited<ReturnType<typeof createSupabaseUser>>
      >;
      try {
        createdUser = await createSupabaseUser(ctx.auth, {
          email: anonymousEmail,
          password: anonymousPassword,
          emailConfirm: true,
          userMetadata: {
            name: "Anonymous User",
            anonymous: true,
          },
        });
      } catch (error) {
        // Auth errors from createSupabaseUser - handleAuthError throws TRPCError (never returns)
        handleAuthError(error, "sign up anonymously");
      }

      // Create user in database
      try {
        await createUserInDatabase(ctx.db, createdUser, {
          timezone: input.timezone ?? null,
          defaultName: "Anonymous User",
        });
      } catch (error) {
        // Database errors from createUserInDatabase - handleDatabaseError throws TRPCError (never returns)
        handleDatabaseError(error, "create anonymous user in database", {
          userId: createdUser.id,
        });
      }

      // Sign in the user
      try {
        return await signInUser(ctx.auth, anonymousEmail, anonymousPassword);
      } catch (error) {
        // Auth errors from signInUser - handleAuthError throws TRPCError
        handleAuthError(error, "sign in anonymous user");
      }
    }),
  refreshToken: publicProcedure
    .input(refreshTokenInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await refreshUserToken(ctx.auth, input.refreshToken);
      } catch (error) {
        handleAuthError(error, "refresh token");
      }
    }),
} satisfies TRPCRouterRecord;
