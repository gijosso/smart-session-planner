import { randomBytes } from "crypto";
import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { emailSchema, passwordSchema, timezoneSchema } from "@ssp/validators";

import { createUserInDatabase } from "../helpers/auth";
import { cleanupSupabaseUserOnFailure } from "../helpers/auth/cleanup";
import {
  createSupabaseUser,
  getUserSession,
  refreshUserToken,
  signInUser,
} from "../helpers/supabase";
import { publicProcedure } from "../trpc";
import { validateRequestSize } from "../utils/middleware";
import {
  rateLimitRefreshToken,
  rateLimitSignIn,
  rateLimitSignUp,
} from "../utils/rate-limit";

/**
 * Auth router
 * Handles user authentication (sign up, sign in, token refresh)
 */
export const authRouter = {
  /**
   * Get current user session
   * Returns null if user is not authenticated
   */
  getSession: publicProcedure.query(({ ctx }) => {
    return getUserSession(ctx.session);
  }),
  /**
   * Sign up a new user
   * Creates user in Supabase Auth and database, then signs them in
   */
  signUp: publicProcedure
    .input(
      z.object({
        email: emailSchema,
        password: passwordSchema,
        timezone: timezoneSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      validateRequestSize(ctx.headers.get("content-length"), true);
      rateLimitSignUp(ctx.headers);

      const createdUser = await createSupabaseUser(ctx.auth, {
        email: input.email,
        password: input.password,
        emailConfirm: true,
      });

      // createUserInDatabase uses withErrorHandling wrapper, so errors are already handled
      // If it fails, we need to clean up the Supabase user to prevent orphaned users
      try {
        await createUserInDatabase(ctx.db, createdUser, {
          timezone: input.timezone ?? null,
        });
      } catch (dbError) {
        // Clean up Supabase user if database creation fails
        await cleanupSupabaseUserOnFailure(
          ctx.auth,
          createdUser.id,
          {
            email: input.email,
            requestId: ctx.requestId,
          },
          dbError,
        );
        // Re-throw the error (withErrorHandling already converted it to TRPCError)
        throw dbError;
      }

      // signInUser already throws TRPCErrors, no need to catch
      return await signInUser(ctx.auth, input.email, input.password);
    }),
  /**
   * Sign in an existing user
   */
  signIn: publicProcedure
    .input(
      z.object({
        email: emailSchema,
        password: z.string().min(1, "Password is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      validateRequestSize(ctx.headers.get("content-length"), true);
      rateLimitSignIn(ctx.headers);
      // signInUser already throws TRPCErrors, no need to catch
      return await signInUser(ctx.auth, input.email, input.password);
    }),
  /**
   * Sign up an anonymous user
   * Creates a user with a random email and password, then signs them in
   * Useful for allowing users to try the app without creating an account
   */
  signUpAnonymously: publicProcedure
    .input(
      z
        .object({
          timezone: timezoneSchema.optional(),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input = {} }) => {
      validateRequestSize(ctx.headers.get("content-length"), true);
      rateLimitSignUp(ctx.headers); // Use same rate limit as regular sign-up
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

      // createUserInDatabase uses withErrorHandling wrapper, so errors are already handled
      // If it fails, we need to clean up the Supabase user to prevent orphaned users
      try {
        await createUserInDatabase(ctx.db, createdUser, {
          timezone: input.timezone ?? null,
          defaultName: "Anonymous User",
        });
      } catch (dbError) {
        // Clean up Supabase user if database creation fails
        await cleanupSupabaseUserOnFailure(
          ctx.auth,
          createdUser.id,
          {
            anonymous: true,
            requestId: ctx.requestId,
          },
          dbError,
        );
        // Re-throw the error (withErrorHandling already converted it to TRPCError)
        throw dbError;
      }

      // signInUser already throws TRPCErrors, no need to catch
      return await signInUser(ctx.auth, anonymousEmail, anonymousPassword);
    }),
  /**
   * Refresh a user's access token
   */
  refreshToken: publicProcedure
    .input(
      z.object({
        refreshToken: z
          .string()
          .min(1, "Refresh token is required")
          .max(1000, "Invalid refresh token format"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      validateRequestSize(ctx.headers.get("content-length"), true);
      rateLimitRefreshToken(ctx.headers);
      // refreshUserToken already throws TRPCErrors, no need to catch
      return await refreshUserToken(ctx.auth, input.refreshToken);
    }),
} satisfies TRPCRouterRecord;
