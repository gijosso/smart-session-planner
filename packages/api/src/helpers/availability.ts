import type { db } from "@ssp/db/client";
import type { WeeklyAvailability } from "@ssp/db/schema";
import { eq } from "@ssp/db";
import { Availability } from "@ssp/db/schema";

import type { DatabaseOrTransaction } from "../utils/types";
import { withErrorHandling } from "../utils/error";
import { logger } from "../utils/logger";

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
 * Uses INSERT ON CONFLICT DO NOTHING to prevent race conditions
 */
export const createDefaultAvailability = async (
  database: DatabaseOrTransaction,
  userId: string,
): Promise<void> => {
  await database
    .insert(Availability)
    .values({
      userId,
      weeklyAvailability: DEFAULT_WEEKLY_AVAILABILITY,
    })
    .onConflictDoNothing();
};

/**
 * Get availability for a user (returns single record with weekly JSON)
 */
export const getAvailability = async (
  database: DatabaseOrTransaction,
  userId: string,
): Promise<typeof Availability.$inferSelect | undefined> =>
  withErrorHandling(
    async () => {
      return await database.query.Availability.findFirst({
        where: eq(Availability.userId, userId),
      });
    },
    "get availability",
    { userId },
  );

/**
 * Set/update weekly availability for a user
 * Creates a new availability record if none exists, otherwise updates existing
 */
export const setWeeklyAvailability = async (
  database: typeof db,
  userId: string,
  weeklyAvailability: WeeklyAvailability,
): Promise<typeof Availability.$inferSelect> =>
  withErrorHandling(
    async () => {
      // Get existing availability or create new
      const existing = await getAvailability(database, userId);

      if (existing) {
        const [updated] = await database
          .update(Availability)
          .set({
            weeklyAvailability,
            updatedAt: new Date(),
          })
          .where(eq(Availability.userId, userId))
          .returning();

        if (!updated) {
          throw new Error("Unable to update availability");
        }

        logger.info("Availability updated", { userId });
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
        throw new Error("Unable to create availability");
      }

      logger.info("Availability created", { userId });
      return created;
    },
    "set weekly availability",
    { userId },
  );
