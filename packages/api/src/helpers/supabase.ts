import { TRPCError } from "@trpc/server";

import type { Auth } from "@ssp/auth";

import { handleDatabaseError } from "../utils/error";
import { logger } from "../utils/logger";

export type SupabaseUser = NonNullable<
  Awaited<ReturnType<Auth["supabase"]["auth"]["admin"]["createUser"]>>["data"]
>["user"];

/**
 * Get user session from context
 * Pass-through function for consistency and potential future enhancements
 * (e.g., session validation, transformation, or caching)
 *
 * Returns the session object (may be null if user is not authenticated)
 */
export function getUserSession(
  session: Awaited<ReturnType<Auth["api"]["getSession"]>>,
): Awaited<ReturnType<Auth["api"]["getSession"]>> {
  return session;
}

/**
 * Create a user in Supabase Auth
 */
export const createSupabaseUser = async (
  auth: Auth,
  options: {
    email: string;
    password: string;
    emailConfirm?: boolean;
    userMetadata?: Record<string, unknown>;
  },
): Promise<NonNullable<SupabaseUser>> => {
  const createResult = await auth.supabase.auth.admin.createUser({
    email: options.email,
    password: options.password,
    email_confirm: options.emailConfirm ?? true,
    user_metadata: options.userMetadata,
  });

  if (createResult.error) {
    // Map Supabase auth errors to appropriate TRPC errors
    // Note: These are authentication errors, not database errors, so we throw TRPCError directly
    // instead of using handleDatabaseError. This allows for specific auth error handling
    // and prevents unnecessary database error logging for auth failures.
    // Don't expose internal error messages to prevent information leakage
    const errorCode = createResult.error.status;
    if (errorCode === 422 || errorCode === 400) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid email or password format",
      });
    }
    if (errorCode === 409) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "A user with this email already exists",
      });
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create user account. Please try again.",
    });
  }

  // TypeScript guarantees data.user is non-null when error is null
  return createResult.data.user;
};

/**
 * Sign in a user and return session tokens
 */
export const signInUser = async (
  auth: Auth,
  email: string,
  password: string,
): Promise<{
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
  };
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
}> => {
  const signInResult = await auth.supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInResult.error) {
    // Map Supabase auth errors
    // Note: For common auth errors (400/401), we throw TRPCError directly for specific handling.
    // For other errors, we use handleDatabaseError to ensure proper logging and error classification.
    const errorCode = signInResult.error.status;
    if (errorCode === 400 || errorCode === 401) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }
    handleDatabaseError(
      new Error(signInResult.error.message),
      "sign in",
      { errorCode },
      "Failed to sign in. Please try again.",
    );
  }

  // TypeScript guarantees data.session is non-null when error is null
  const session = signInResult.data.session;

  const accessToken = session.access_token;
  const refreshToken = session.refresh_token;
  const expiresAt = session.expires_at;

  // Validate access token exists
  // Note: This is an internal error (malformed response from Supabase), not a user error
  // We throw TRPCError directly instead of using handleDatabaseError since this is
  // an unexpected system error that should be logged differently than database errors
  if (!accessToken || typeof accessToken !== "string") {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to sign in: No access token in session",
    });
  }

  return {
    user: {
      id: signInResult.data.user.id,
      email: signInResult.data.user.email ?? email,
      emailVerified: !!signInResult.data.user.email_confirmed_at,
    },
    accessToken,
    refreshToken,
    expiresAt: expiresAt ?? null,
  };
};

/**
 * Delete a Supabase user (admin operation)
 * Used for cleanup when user creation fails
 */
export const deleteSupabaseUser = async (
  auth: Auth,
  userId: string,
): Promise<void> => {
  const deleteResult = await auth.supabase.auth.admin.deleteUser(userId);

  if (deleteResult.error) {
    // Log but don't throw - cleanup failures shouldn't break the main error flow
    // The orphaned user can be cleaned up manually if needed
    logger.warn("Failed to delete Supabase user during cleanup", {
      userId,
      error: deleteResult.error.message,
    });
  }
};

/**
 * Refresh a user's access token
 */
export const refreshUserToken = async (
  auth: Auth,
  refreshToken: string,
): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
}> => {
  // Validate refresh token format (basic validation)
  // Note: This is a validation error for user input, but we throw TRPCError directly
  // instead of using throw new Error since this is an auth-specific validation
  // that doesn't need database error handling patterns
  if (
    !refreshToken ||
    typeof refreshToken !== "string" ||
    refreshToken.length < 10
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid refresh token format",
    });
  }

  const refreshResult = await auth.supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (refreshResult.error) {
    // Map Supabase auth errors
    // Note: These are authentication errors, not database errors, so we throw TRPCError directly
    // instead of using handleDatabaseError. This allows for specific auth error handling.
    const errorCode = refreshResult.error.status;
    if (errorCode === 400 || errorCode === 401) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired refresh token",
      });
    }
    handleDatabaseError(
      new Error(refreshResult.error.message),
      "refresh token",
      { errorCode },
      "Failed to refresh token. Please sign in again.",
    );
  }

  // Validate session exists
  // Note: This is an internal error (malformed response from Supabase), not a user error
  // We throw TRPCError directly instead of using handleDatabaseError since this is
  // an unexpected system error that should be logged differently than database errors
  const session = refreshResult.data.session;
  if (!session) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to refresh token: No session returned",
    });
  }

  const accessToken = session.access_token;
  const newRefreshToken = session.refresh_token;
  const expiresAt = session.expires_at;

  // Validate access token exists
  if (!accessToken || typeof accessToken !== "string") {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to refresh token: No access token in session",
    });
  }

  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresAt: expiresAt ?? null,
  };
};
