import { sql } from "drizzle-orm";
import { index, pgEnum, pgTable } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { User } from "./user";

export const SESSION_TYPES = [
  "DEEP_WORK",
  "WORKOUT",
  "LANGUAGE",
  "MEDITATION",
  "CLIENT_MEETING",
  "STUDY",
  "READING",
  "OTHER",
] as const;

export type SessionType = (typeof SESSION_TYPES)[number];

export const sessionTypeEnum = pgEnum("session_type", SESSION_TYPES);

/**
 * Session table - stores user's scheduled sessions
 * Sessions can be of different types (Deep Work, Workout, Language, etc.)
 * and have scheduled times, completion status, and optional descriptions
 */
export const Session = pgTable(
  "session",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    userId: t
      .uuid()
      .notNull()
      .references(() => User.id, { onDelete: "cascade" }),
    title: t.varchar({ length: 256 }).notNull(),
    type: sessionTypeEnum("type").notNull(),
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
  }),
  (table) => [
    // Index for filtering by userId (most common query pattern)
    index("session_user_id_idx").on(table.userId),
    // Composite index for stats queries filtering by userId and completed
    index("session_user_id_completed_idx").on(table.userId, table.completed),
    // Composite index for date range queries filtering by userId and startTime
    index("session_user_id_start_time_idx").on(table.userId, table.startTime),
    // Composite index for streak/spacing calculations (userId, completed, startTime)
    index("session_user_id_completed_start_time_idx").on(
      table.userId,
      table.completed,
      table.startTime,
    ),
    // Index for type breakdown queries (userId, type)
    index("session_user_id_type_idx").on(table.userId, table.type),
  ],
);

export const CreateSessionSchema = createInsertSchema(Session, {
  title: z.string().max(256),
  type: z.enum(SESSION_TYPES),
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
