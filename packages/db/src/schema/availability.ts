import { sql } from "drizzle-orm";
import { index, pgEnum, pgTable } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { User } from "./user";

export const DAYS_OF_WEEK = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const dayOfWeekEnum = pgEnum("days_of_week", DAYS_OF_WEEK);

/**
 * Availability table - stores user's weekly availability windows
 * Each row represents a time window on a specific day of the week
 * Example: Monday 7-9am, Saturday 10am-2pm
 * A user can have multiple availability windows per day
 */
export const Availability = pgTable(
  "availability",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    userId: t
      .uuid()
      .notNull()
      .references(() => User.id, { onDelete: "cascade" }),
    dayOfWeek: dayOfWeekEnum("day_of_week").notNull(),
    startTime: t.time().notNull(), // Format: HH:MM:SS (e.g., "07:00:00")
    endTime: t.time().notNull(), // Format: HH:MM:SS (e.g., "09:00:00")
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .$onUpdateFn(() => sql`now()`),
  }),
  (table) => [
    // Index for filtering by userId (most common query pattern)
    index("availability_user_id_idx").on(table.userId),
    // Composite index for queries filtering by userId and dayOfWeek
    index("availability_user_id_day_of_week_idx").on(
      table.userId,
      table.dayOfWeek,
    ),
  ],
);

export const CreateAvailabilitySchema = createInsertSchema(Availability, {
  userId: z.uuid(),
  dayOfWeek: z.enum(DAYS_OF_WEEK),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}:\d{2}$/, "Start time must be in HH:MM:SS format"),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}:\d{2}$/, "End time must be in HH:MM:SS format"),
})
  .omit({
    id: true,
    userId: true, // userId is added by the API from the session
    createdAt: true,
    updatedAt: true,
  })
  .refine(
    (data) => {
      // Ensure endTime is after startTime
      const [startHours, startMinutes] = data.startTime.split(":").map(Number);
      const [endHours, endMinutes] = data.endTime.split(":").map(Number);
      const startTotal = (startHours ?? 0) * 60 + (startMinutes ?? 0);
      const endTotal = (endHours ?? 0) * 60 + (endMinutes ?? 0);
      return endTotal > startTotal;
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    },
  );
