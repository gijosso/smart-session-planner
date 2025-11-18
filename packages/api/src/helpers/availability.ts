import type { z } from "zod/v4";

import type { db } from "@ssp/db/client";
import type { CreateAvailabilitySchema } from "@ssp/db/schema";
import { and, eq } from "@ssp/db";
import { Availability, DAYS_OF_WEEK } from "@ssp/db/schema";

/**
 * Create default availability for a new user
 * Monday-Friday: 7am-9am
 * Saturday-Sunday: 10am-2pm
 * Only creates if the user doesn't already have availability entries
 */
export async function createDefaultAvailability(
  database: typeof db,
  userId: string,
) {
  // Check if user already has availability entries
  const existingAvailability = await database.query.Availability.findFirst({
    where: eq(Availability.userId, userId),
  });

  // Only create defaults if no availability exists
  if (existingAvailability) {
    return;
  }

  const defaultAvailability = [
    // Monday-Friday: 7am-9am
    ...DAYS_OF_WEEK.slice(0, 5).map((day) => ({
      userId,
      dayOfWeek: day,
      startTime: "07:00:00",
      endTime: "09:00:00",
    })),
    // Saturday-Sunday: 10am-2pm
    ...DAYS_OF_WEEK.slice(5).map((day) => ({
      userId,
      dayOfWeek: day,
      startTime: "10:00:00",
      endTime: "14:00:00",
    })),
  ];

  await database.insert(Availability).values(defaultAvailability);
}

/**
 * Get all availability windows for a user
 */
export async function getAllAvailability(database: typeof db, userId: string) {
  return database.query.Availability.findMany({
    where: eq(Availability.userId, userId),
    orderBy: [Availability.dayOfWeek, Availability.startTime],
  });
}

/**
 * Create a new availability window
 */
export async function createAvailability(
  database: typeof db,
  userId: string,
  input: z.infer<typeof CreateAvailabilitySchema>,
) {
  const [result] = await database
    .insert(Availability)
    .values({
      ...input,
      userId,
    })
    .returning();

  if (!result) {
    throw new Error("Failed to create availability");
  }

  return result;
}

/**
 * Update an availability window (only if it belongs to the user)
 */
export async function updateAvailability(
  database: typeof db,
  userId: string,
  id: string,
  updates: {
    dayOfWeek?: z.infer<typeof CreateAvailabilitySchema>["dayOfWeek"];
    startTime?: string;
    endTime?: string;
  },
) {
  // Verify the availability belongs to the user
  const existingAvailability = await database.query.Availability.findFirst({
    where: and(eq(Availability.id, id), eq(Availability.userId, userId)),
  });

  if (!existingAvailability) {
    throw new Error("Availability not found or access denied");
  }

  const [updated] = await database
    .update(Availability)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(Availability.id, id))
    .returning();

  if (!updated) {
    throw new Error("Failed to update availability");
  }

  return updated;
}

/**
 * Delete an availability window (only if it belongs to the user)
 */
export async function deleteAvailability(
  database: typeof db,
  userId: string,
  id: string,
) {
  // Verify the availability belongs to the user
  const existingAvailability = await database.query.Availability.findFirst({
    where: and(eq(Availability.id, id), eq(Availability.userId, userId)),
  });

  if (!existingAvailability) {
    throw new Error("Availability not found or access denied");
  }

  return database.delete(Availability).where(eq(Availability.id, id));
}
