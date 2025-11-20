import type { db } from "@ssp/db/client";
import { eq } from "@ssp/db";
import { Profile, User } from "@ssp/db/schema";

import type { SupabaseUser } from "./supabase";
import { withErrorHandling } from "../utils/error";
import { logger } from "../utils/logger";
import { createDefaultAvailability } from "./availability";

/**
 * Create User and Profile records in database with error handling
 * Handles cases where User or Profile might already exist
 */
export const createUserInDatabase = async (
  database: typeof db,
  supabaseUser: NonNullable<SupabaseUser>,
  options: {
    timezone?: string | null;
    defaultName?: string;
  },
): Promise<void> =>
  withErrorHandling(
    async () => {
      const userId = supabaseUser.id;

      // Check if user already exists
      const existingUser = await database
        .select()
        .from(User)
        .where(eq(User.id, userId))
        .limit(1);

      if (existingUser.length > 0) {
        // User exists, check if Profile exists
        const existingProfile = await database
          .select()
          .from(Profile)
          .where(eq(Profile.userId, userId))
          .limit(1);

        if (existingProfile.length === 0) {
          // User exists but Profile doesn't, create Profile and availability
          await database.insert(Profile).values({
            userId: userId,
            timezone: options.timezone ?? null,
          });
          await createDefaultAvailability(database, userId);
        }
        return; // User already exists, nothing to do
      }

      // User doesn't exist, create everything
      // Extract user name with proper null handling
      const userMetadata = supabaseUser.user_metadata as
        | { name?: string; avatar_url?: string }
        | null
        | undefined;
      const userName =
        userMetadata?.name ??
        options.defaultName ??
        (supabaseUser.email ? supabaseUser.email.split("@")[0] : null) ??
        null;
      const userImage = userMetadata?.avatar_url;

      await database.insert(User).values({
        id: userId,
        name: userName,
        image: userImage ?? null,
      });

      await database.insert(Profile).values({
        userId: userId,
        timezone: options.timezone ?? null,
      });

      await createDefaultAvailability(database, userId);

      logger.info("User created in database", {
        userId,
        email: supabaseUser.email ?? "unknown",
        anonymous: options.defaultName === "Anonymous User",
      });
    },
    "create user in database",
    {
      userId: supabaseUser.id,
      email: supabaseUser.email ?? "unknown",
      anonymous: options.defaultName === "Anonymous User",
    },
  );
