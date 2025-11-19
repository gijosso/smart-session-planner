import { sql } from "drizzle-orm";
import { index, jsonb, pgTable } from "drizzle-orm/pg-core";
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

/**
 * Time window schema for availability segments
 */
export const timeWindowSchema = z.object({
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}:\d{2}$/, "Start time must be in HH:MM:SS format"),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}:\d{2}$/, "End time must be in HH:MM:SS format"),
});

export type TimeWindow = z.infer<typeof timeWindowSchema>;

/**
 * Weekly availability schema - maps each day to an array of time windows
 */
export const weeklyAvailabilitySchema = z.record(
  z.enum(DAYS_OF_WEEK),
  z.array(timeWindowSchema),
);

export type WeeklyAvailability = z.infer<typeof weeklyAvailabilitySchema>;

/**
 * Availability table - stores user's weekly availability as JSON
 * One row per user containing all availability windows for the week
 * Structure: { "MONDAY": [{ startTime: "07:00:00", endTime: "09:00:00" }], ... }
 */
export const Availability = pgTable(
  "availability",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    userId: t
      .uuid()
      .notNull()
      .references(() => User.id, { onDelete: "cascade" })
      .unique(), // One availability record per user
    // JSON structure: { "MONDAY": [{ startTime, endTime }], "TUESDAY": [...], ... }
    weeklyAvailability: jsonb("weekly_availability")
      .$type<WeeklyAvailability>()
      .notNull()
      .default(sql`'{}'::jsonb`),
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
  ],
);

export const CreateAvailabilitySchema = createInsertSchema(Availability, {
  userId: z.uuid(),
  weeklyAvailability: weeklyAvailabilitySchema,
}).omit({
  id: true,
  userId: true, // userId is added by the API from the session
  createdAt: true,
  updatedAt: true,
});
