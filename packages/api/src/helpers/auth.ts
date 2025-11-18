import type { db } from "@ssp/db/client";
import { eq } from "@ssp/db";
import { Profile, User } from "@ssp/db/schema";

import type { SupabaseUser } from "./supabase";
import { createDefaultAvailability } from "./availability";

/**
 * Create User and Profile records in database with error handling
 * Handles cases where User or Profile might already exist
 */
export async function createUserInDatabase(
  database: typeof db,
  supabaseUser: NonNullable<SupabaseUser>,
  options: {
    timezone?: string | null;
    defaultName?: string;
  },
) {
  const userId = supabaseUser.id;

  try {
    const userName =
      (supabaseUser.user_metadata as { name?: string } | null | undefined)
        ?.name ??
      options.defaultName ??
      supabaseUser.email?.split("@")[0] ??
      null;
    const userImage = (
      supabaseUser.user_metadata as { avatar_url?: string } | null | undefined
    )?.avatar_url;

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
  } catch (dbError) {
    // If User already exists (e.g., from previous signup), that's okay
    // Check if User exists, if not, rethrow
    const existingUser = await database
      .select()
      .from(User)
      .where(eq(User.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      throw new Error(
        `Failed to create user record: ${dbError instanceof Error ? dbError.message : "Unknown error"}`,
      );
    }

    // If User exists but Profile doesn't, create Profile
    const existingProfile = await database
      .select()
      .from(Profile)
      .where(eq(Profile.userId, userId))
      .limit(1);

    if (existingProfile.length === 0) {
      await database.insert(Profile).values({
        userId: userId,
        timezone: options.timezone ?? null,
      });
      await createDefaultAvailability(database, userId);
    }
  }
}
