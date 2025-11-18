import { sql } from "drizzle-orm";
import { pgTable } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { User } from "./user";

/**
 * Availability table - stores user's weekly availability windows
 * Each row represents a time window on a specific day of the week
 * Example: Monday 7-9am, Saturday 10am-2pm
 * A user can have multiple availability windows per day
 */
export const Availability = pgTable("availability", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  userId: t
    .uuid()
    .notNull()
    .references(() => User.id, { onDelete: "cascade" }),
  dayOfWeek: t.integer().notNull(), // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: t.time().notNull(), // Format: HH:MM:SS (e.g., "07:00:00")
  endTime: t.time().notNull(), // Format: HH:MM:SS (e.g., "09:00:00")
  createdAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$onUpdateFn(() => sql`now()`),
}));

export const CreateAvailabilitySchema = createInsertSchema(Availability, {
  userId: z.uuid(),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
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
