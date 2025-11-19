import type { z } from "zod/v4";

import type { db } from "@ssp/db/client";
import type { CreateAvailabilitySchema } from "@ssp/db/schema";
import { and, eq } from "@ssp/db";
import { Availability, DAYS_OF_WEEK } from "@ssp/db/schema";

/**
 * Convert time string (HH:MM:SS) to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

/**
 * Convert minutes since midnight to time string (HH:MM:SS)
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:00`;
}

/**
 * Check if two time ranges overlap
 */
function timeRangesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string,
): boolean {
  const start1Min = timeToMinutes(start1);
  const end1Min = timeToMinutes(end1);
  const start2Min = timeToMinutes(start2);
  const end2Min = timeToMinutes(end2);

  // Check if ranges overlap (including touching at boundaries)
  return start1Min <= end2Min && start2Min <= end1Min;
}

/**
 * Merge two overlapping time ranges
 */
function mergeTimeRanges(
  start1: string,
  end1: string,
  start2: string,
  end2: string,
): { start: string; end: string } {
  const start1Min = timeToMinutes(start1);
  const end1Min = timeToMinutes(end1);
  const start2Min = timeToMinutes(start2);
  const end2Min = timeToMinutes(end2);

  const mergedStart = Math.min(start1Min, start2Min);
  const mergedEnd = Math.max(end1Min, end2Min);

  return {
    start: minutesToTime(mergedStart),
    end: minutesToTime(mergedEnd),
  };
}

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
 * Create a new availability window, merging with overlapping windows
 */
export async function createAvailability(
  database: typeof db,
  userId: string,
  input: z.infer<typeof CreateAvailabilitySchema>,
) {
  // Find all availability windows for the same day
  const sameDayAvailability = await database.query.Availability.findMany({
    where: and(
      eq(Availability.userId, userId),
      eq(Availability.dayOfWeek, input.dayOfWeek),
    ),
  });

  // Find overlapping windows
  const overlappingWindows = sameDayAvailability.filter((item) =>
    timeRangesOverlap(
      input.startTime,
      input.endTime,
      item.startTime,
      item.endTime,
    ),
  );

  if (overlappingWindows.length === 0) {
    // No overlaps, just create the new window
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

  // Merge all overlapping windows
  let mergedStart = input.startTime;
  let mergedEnd = input.endTime;

  for (const window of overlappingWindows) {
    const merged = mergeTimeRanges(
      mergedStart,
      mergedEnd,
      window.startTime,
      window.endTime,
    );
    mergedStart = merged.start;
    mergedEnd = merged.end;
  }

  // Delete overlapping windows
  for (const window of overlappingWindows) {
    await database.delete(Availability).where(eq(Availability.id, window.id));
  }

  // Create merged window
  const [result] = await database
    .insert(Availability)
    .values({
      dayOfWeek: input.dayOfWeek,
      startTime: mergedStart,
      endTime: mergedEnd,
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
 * Merges with overlapping windows if day or time changes
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

  // Determine the final values (use updates or existing values)
  const finalDayOfWeek = updates.dayOfWeek ?? existingAvailability.dayOfWeek;
  const finalStartTime = updates.startTime ?? existingAvailability.startTime;
  const finalEndTime = updates.endTime ?? existingAvailability.endTime;

  // Find all availability windows for the same day (excluding the current one)
  const sameDayAvailability = await database.query.Availability.findMany({
    where: and(
      eq(Availability.userId, userId),
      eq(Availability.dayOfWeek, finalDayOfWeek),
    ),
  });

  // Find overlapping windows (excluding the current one)
  const overlappingWindows = sameDayAvailability.filter(
    (item) =>
      item.id !== id &&
      timeRangesOverlap(
        finalStartTime,
        finalEndTime,
        item.startTime,
        item.endTime,
      ),
  );

  if (overlappingWindows.length === 0) {
    // No overlaps, just update the window
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

  // Merge all overlapping windows
  let mergedStart = finalStartTime;
  let mergedEnd = finalEndTime;

  for (const window of overlappingWindows) {
    const merged = mergeTimeRanges(
      mergedStart,
      mergedEnd,
      window.startTime,
      window.endTime,
    );
    mergedStart = merged.start;
    mergedEnd = merged.end;
  }

  // Delete overlapping windows
  for (const window of overlappingWindows) {
    await database.delete(Availability).where(eq(Availability.id, window.id));
  }

  // Update the current window with merged values
  const [updated] = await database
    .update(Availability)
    .set({
      dayOfWeek: finalDayOfWeek,
      startTime: mergedStart,
      endTime: mergedEnd,
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
