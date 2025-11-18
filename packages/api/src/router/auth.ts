import { randomBytes } from "crypto";
import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { eq } from "@ssp/db";
import { Profile, User } from "@ssp/db/schema";

import { protectedProcedure, publicProcedure } from "../trpc";

const authRouter = {
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session;
  }),
  getSecretMessage: protectedProcedure.query(() => {
    return "you can see this secret message!";
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
      // Use Supabase Admin API to create user and sign them in
      const createResult = await ctx.auth.supabase.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
      });

      if (createResult.error) {
        throw new Error(`Failed to create user: ${createResult.error.message}`);
      }

      const createdUser = createResult.data.user;

      // Create User record in database
      try {
        const userName = (
          createdUser.user_metadata as { name?: string } | null | undefined
        )?.name;
        const userImage = (
          createdUser.user_metadata as
            | { avatar_url?: string }
            | null
            | undefined
        )?.avatar_url;
        await ctx.db.insert(User).values({
          id: createdUser.id,
          name: userName ?? createdUser.email?.split("@")[0] ?? null,
          image: userImage ?? null,
        });

        // Create Profile record with timezone
        await ctx.db.insert(Profile).values({
          userId: createdUser.id,
          timezone: input.timezone ?? null, // Use provided timezone or null (will default to UTC in queries)
        });
      } catch (dbError) {
        // If User already exists (e.g., from previous signup), that's okay
        // Check if User exists, if not, rethrow
        const existingUser = await ctx.db
          .select()
          .from(User)
          .where(eq(User.id, createdUser.id))
          .limit(1);
        if (existingUser.length === 0) {
          throw new Error(
            `Failed to create user record: ${dbError instanceof Error ? dbError.message : "Unknown error"}`,
          );
        }
        // If User exists but Profile doesn't, create Profile
        const existingProfile = await ctx.db
          .select()
          .from(Profile)
          .where(eq(Profile.userId, createdUser.id))
          .limit(1);
        if (existingProfile.length === 0) {
          await ctx.db.insert(Profile).values({
            userId: createdUser.id,
            timezone: input.timezone ?? null, // Use provided timezone or null (will default to UTC in queries)
          });
        }
      }

      // Sign in the user to get a session token
      const signInResult = await ctx.auth.supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });

      if (signInResult.error) {
        throw new Error(`Failed to sign in: ${signInResult.error.message}`);
      }

      const session = signInResult.data.session;
      const accessToken = session.access_token;
      const refreshToken = session.refresh_token;
      const expiresAt = session.expires_at;

      if (!accessToken) {
        throw new Error("Failed to sign in: No session token returned");
      }

      return {
        user: {
          id: createdUser.id,
          email: createdUser.email ?? input.email,
          emailVerified: !!createdUser.email_confirmed_at,
        },
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresAt: expiresAt ?? null,
      };
    }),
  signIn: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Sign in using Supabase auth
      const signInResult = await ctx.auth.supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });

      if (signInResult.error) {
        throw new Error(`Failed to sign in: ${signInResult.error.message}`);
      }

      const session = signInResult.data.session;
      const accessToken = session.access_token;
      const refreshToken = session.refresh_token;
      const expiresAt = session.expires_at;

      return {
        user: {
          id: signInResult.data.user.id,
          email: signInResult.data.user.email ?? input.email,
          emailVerified: !!signInResult.data.user.email_confirmed_at,
        },
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresAt: expiresAt ?? null,
      };
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

      // Create anonymous user using Supabase Admin API
      const createResult = await ctx.auth.supabase.auth.admin.createUser({
        email: anonymousEmail,
        password: anonymousPassword,
        email_confirm: true,
        user_metadata: {
          name: "Anonymous User",
          anonymous: true,
        },
      });

      if (createResult.error) {
        throw new Error(
          `Failed to create anonymous user: ${createResult.error.message}`,
        );
      }

      const createdUser = createResult.data.user;

      // Create User record in database
      try {
        const userName = (
          createdUser.user_metadata as { name?: string } | null | undefined
        )?.name;
        const userImage = (
          createdUser.user_metadata as
            | { avatar_url?: string }
            | null
            | undefined
        )?.avatar_url;
        await ctx.db.insert(User).values({
          id: createdUser.id,
          name: userName ?? "Anonymous User",
          image: userImage ?? null,
        });

        // Create Profile record with timezone
        await ctx.db.insert(Profile).values({
          userId: createdUser.id,
          timezone: input.timezone ?? null, // Use provided timezone or null (will default to UTC in queries)
        });
      } catch (dbError) {
        // If User already exists, that's okay - check and create Profile if needed
        const existingUser = await ctx.db
          .select()
          .from(User)
          .where(eq(User.id, createdUser.id))
          .limit(1);
        if (existingUser.length === 0) {
          throw new Error(
            `Failed to create anonymous user record: ${dbError instanceof Error ? dbError.message : "Unknown error"}`,
          );
        }
        // If User exists but Profile doesn't, create Profile
        const existingProfile = await ctx.db
          .select()
          .from(Profile)
          .where(eq(Profile.userId, createdUser.id))
          .limit(1);
        if (existingProfile.length === 0) {
          await ctx.db.insert(Profile).values({
            userId: createdUser.id,
            timezone: input.timezone ?? null, // Use provided timezone or null (will default to UTC in queries)
          });
        }
      }

      // Sign in the anonymous user to get a session token
      const signInResult = await ctx.auth.supabase.auth.signInWithPassword({
        email: anonymousEmail,
        password: anonymousPassword,
      });

      if (signInResult.error) {
        throw new Error(
          `Failed to sign in anonymous user: ${signInResult.error.message}`,
        );
      }

      const session = signInResult.data.session;
      const accessToken = session.access_token;
      const refreshToken = session.refresh_token;
      const expiresAt = session.expires_at;

      if (!accessToken) {
        throw new Error(
          "Failed to sign in anonymous user: No session token returned",
        );
      }

      return {
        user: {
          id: createdUser.id,
          email: createdUser.email ?? anonymousEmail,
          emailVerified: !!createdUser.email_confirmed_at,
        },
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresAt: expiresAt ?? null,
      };
    }),
  refreshToken: publicProcedure
    .input(
      z.object({
        refreshToken: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Use Supabase to refresh the token
      const refreshResult = await ctx.auth.supabase.auth.refreshSession({
        refresh_token: input.refreshToken,
      });

      if (refreshResult.error) {
        throw new Error(
          `Failed to refresh token: ${refreshResult.error.message}`,
        );
      }

      const session = refreshResult.data.session;
      const accessToken = session?.access_token;
      const refreshToken = session?.refresh_token;
      const expiresAt = session?.expires_at;

      if (!accessToken) {
        throw new Error("Failed to refresh token: No session token returned");
      }

      return {
        accessToken: accessToken,
        refreshToken: refreshToken ?? null,
        expiresAt: expiresAt ?? null,
      };
    }),
} satisfies TRPCRouterRecord;

export { authRouter };
