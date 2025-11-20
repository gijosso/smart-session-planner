import type { Auth } from "@ssp/auth";

import { deleteSupabaseUser } from "../supabase";
import { logger } from "../../utils/logger";

/**
 * Cleanup Supabase user if database creation fails
 * Handles cleanup errors gracefully and logs them prominently
 *
 * This is used when user creation fails partway through the process
 * (e.g., Supabase user created but database user creation fails).
 * The cleanup prevents orphaned Supabase users.
 *
 * NOTE: This is NOT fully atomic - if cleanup fails, orphaned Supabase users may exist.
 * Consider implementing a background cleanup job for orphaned users.
 *
 * @param auth - Auth instance for Supabase operations
 * @param userId - Supabase user ID to clean up
 * @param context - Additional context for logging (email, requestId, etc.)
 * @param originalError - The original error that triggered cleanup
 */
export async function cleanupSupabaseUserOnFailure(
  auth: Auth,
  userId: string,
  context: {
    email?: string;
    requestId?: string;
    anonymous?: boolean;
    [key: string]: unknown;
  },
  originalError: unknown,
): Promise<void> {
  try {
    await deleteSupabaseUser(auth, userId);
  } catch (cleanupError) {
    // Log cleanup failures prominently - these indicate orphaned users
    logger.error(
      "CRITICAL: Failed to cleanup Supabase user after DB creation failure",
      {
        userId,
        requestId: context.requestId,
        email: context.email,
        anonymous: context.anonymous ?? false,
        cleanupError:
          cleanupError instanceof Error
            ? cleanupError.message
            : String(cleanupError),
        originalError:
          originalError instanceof Error
            ? originalError.message
            : String(originalError),
        ...context,
      },
    );
    // Don't throw - cleanup failure is secondary to the original error
    // The original error will be thrown by the caller
  }
}

