import { sql } from "drizzle-orm";
import { pgTable } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { User } from "./user";

/**
 * Session table - stores user's scheduled sessions
 * Sessions can be of different types (Deep Work, Workout, Language, etc.)
 * and have scheduled times, completion status, and optional descriptions
 */
export const Session = pgTable("session", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  userId: t
    .uuid()
    .notNull()
    .references(() => User.id, { onDelete: "cascade" }),
  title: t.varchar({ length: 256 }).notNull(),
  type: t.varchar({ length: 100 }).notNull(), // e.g., "Deep Work", "Workout", "Language", "Meditation", "Client Meeting"
  startTime: t.timestamp({ mode: "date", withTimezone: true }).notNull(), // Store in UTC
  endTime: t.timestamp({ mode: "date", withTimezone: true }).notNull(), // Store in UTC
  completed: t.boolean().notNull().default(false),
  priority: t.integer().notNull().default(3), // Priority level 1-5 (default: 3)
  description: t.text(), // Optional description/notes
  createdAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$onUpdateFn(() => sql`now()`),
}));

export const CreateSessionSchema = createInsertSchema(Session, {
  title: z.string().max(256),
  type: z.string().max(100),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  completed: z.boolean().default(false),
  priority: z.coerce.number().int().min(1).max(5).default(3),
  description: z.string().optional(),
  userId: z.uuid(),
}).omit({
  id: true,
  userId: true, // userId is added by the API from the session
  createdAt: true,
  updatedAt: true,
});
