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

  const userName =
    (supabaseUser.user_metadata as { name?: string } | null | undefined)
      ?.name ??
    options.defaultName ??
    supabaseUser.email?.split("@")[0] ??
    null;
  const userImage = (
    supabaseUser.user_metadata as { avatar_url?: string } | null | undefined
  )?.avatar_url;

  // Check if User already exists first
  const existingUser = await database
    .select()
    .from(User)
    .where(eq(User.id, userId))
    .limit(1);

  if (existingUser.length === 0) {
    // User doesn't exist, create User, Profile, and Availability
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
  } else {
    // User exists, check if Profile exists
    const existingProfile = await database
      .select()
      .from(Profile)
      .where(eq(Profile.userId, userId))
      .limit(1);

    if (existingProfile.length === 0) {
      // Profile doesn't exist, create Profile and Availability
      await database.insert(Profile).values({
        userId: userId,
        timezone: options.timezone ?? null,
      });

      await createDefaultAvailability(database, userId);
    }
    // If both User and Profile exist, do nothing (idempotent)
  }
}
