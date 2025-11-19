import type { db } from "@ssp/db/client";
import type { DayOfWeek, WeeklyAvailability } from "@ssp/db/schema";
import { eq } from "@ssp/db";
import { Availability, DAYS_OF_WEEK } from "@ssp/db/schema";

import { mergeTimeRanges, timeRangesOverlap } from "../utils/date";

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
 */
export async function setWeeklyAvailability(
  database: typeof db,
  userId: string,
  weeklyAvailability: WeeklyAvailability,
) {
  // Get existing availability or create new
  const existing = await getAvailability(database, userId);

  if (existing) {
    const [updated] = await database
      .update(Availability)
      .set({
        weeklyAvailability,
        updatedAt: new Date(),
      })
      .where(eq(Availability.id, existing.id))
      .returning();

    if (!updated) {
      throw new Error("Failed to update availability");
    }

    return updated;
  }

  const [created] = await database
    .insert(Availability)
    .values({
      userId,
      weeklyAvailability,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create availability");
  }

  return created;
}
