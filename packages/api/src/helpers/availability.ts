import type { db } from "@ssp/db/client";
import type { WeeklyAvailability } from "@ssp/db/schema";
import { eq } from "@ssp/db";
import { Availability } from "@ssp/db/schema";

import { DatabaseError } from "../utils/error/codes";

/**
 * Type that accepts both database and transaction objects
 * Used for functions that need to work within transactions
 */
type DatabaseOrTransaction =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Default weekly availability structure
 */
const DEFAULT_WEEKLY_AVAILABILITY: WeeklyAvailability = {
  MONDAY: [{ startTime: "07:00:00", endTime: "09:00:00" }],
  TUESDAY: [{ startTime: "07:00:00", endTime: "09:00:00" }],
  WEDNESDAY: [{ startTime: "07:00:00", endTime: "09:00:00" }],
  THURSDAY: [{ startTime: "07:00:00", endTime: "09:00:00" }],
  FRIDAY: [{ startTime: "07:00:00", endTime: "09:00:00" }],
  SATURDAY: [{ startTime: "10:00:00", endTime: "14:00:00" }],
  SUNDAY: [{ startTime: "10:00:00", endTime: "14:00:00" }],
};

/**
 * Create default availability for a new user
 * Monday-Friday: 7am-9am
 * Saturday-Sunday: 10am-2pm
 * Only creates if the user doesn't already have availability entries
 */
export async function createDefaultAvailability(
  database: DatabaseOrTransaction,
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

  await database.insert(Availability).values({
    userId,
    weeklyAvailability: DEFAULT_WEEKLY_AVAILABILITY,
  });
}

/**
 * Get availability for a user (returns single record with weekly JSON)
 */
export async function getAvailability(database: typeof db, userId: string) {
  return database.query.Availability.findFirst({
    where: eq(Availability.userId, userId),
  });
}

/**
 * Set/update weekly availability for a user
 * Uses transaction to ensure atomicity - check and update/create happen atomically
 */
export async function setWeeklyAvailability(
  database: typeof db,
  userId: string,
  weeklyAvailability: WeeklyAvailability,
) {
  // Use transaction to ensure atomicity - check and update/create happen atomically
  return await database.transaction(async (tx) => {
    // Get existing availability within transaction
    const existing = await tx.query.Availability.findFirst({
      where: eq(Availability.userId, userId),
    });

    if (existing) {
      const [updated] = await tx
        .update(Availability)
        .set({
          weeklyAvailability,
          updatedAt: new Date(),
        })
        .where(eq(Availability.userId, userId))
        .returning();

      if (!updated) {
        throw new DatabaseError(
          "Failed to update availability. Please try again.",
          undefined,
          {
            userId,
            operation: "setWeeklyAvailability",
          },
        );
      }

      return updated;
    }

    const [created] = await tx
      .insert(Availability)
      .values({
        userId,
        weeklyAvailability,
      })
      .returning();

    if (!created) {
      throw new DatabaseError(
        "Failed to create availability. Please try again.",
        undefined,
        {
          userId,
          operation: "setWeeklyAvailability",
        },
      );
    }

    return created;
  });
}
