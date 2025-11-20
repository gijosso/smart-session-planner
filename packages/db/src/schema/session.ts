import { sql } from "drizzle-orm";
import { check, index, pgEnum, pgTable } from "drizzle-orm/pg-core";
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
    completedAt: t.timestamp({ mode: "date", withTimezone: true }), // Timestamp when session was completed
    priority: t.integer().notNull().default(3), // Priority level 1-5 (default: 3)
    description: t.text(), // Optional description/notes
    fromSuggestionId: t.text(), // Optional: ID of the suggestion this session was created from
    deletedAt: t.timestamp({ mode: "date", withTimezone: true }), // Soft delete timestamp
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => sql`now()`),
  }),
  (table) => [
    // All indexes start with userId since it's in every query (leftmost column rule)

    // 1. Partial covering index for non-deleted sessions (userId, startTime)
    // Covers: getSessionsToday, getSessionsWeek
    // Also covers userId-only queries (leftmost column)
    index("session_user_id_not_deleted_start_idx")
      .on(table.userId, table.startTime)
      .where(sql`deleted_at IS NULL`),

    // 2. Stats index for completed sessions (userId, completed, startTime)
    // Covers: stats queries filtering by completed status, streak calculations
    // Also covers (userId) and (userId, completed) queries
    index("session_user_id_completed_start_time_idx").on(
      table.userId,
      table.completed,
      table.startTime,
    ),

    // 3. Type breakdown index (userId, type)
    // Covers: stats queries grouping by type
    // Also covers userId-only queries (leftmost column)
    index("session_user_id_type_idx").on(table.userId, table.type),

    // 4. Partial index for conflict detection
    // Only indexes active (non-deleted, non-completed) sessions
    // Covers: checkSessionConflicts (most common write operation)
    index("session_user_id_active_idx")
      .on(table.userId, table.startTime)
      .where(sql`deleted_at IS NULL AND completed = false`),

    // 5. Composite partial index for fromSuggestionId queries (userId, fromSuggestionId)
    // Covers: queries filtering sessions by user and suggestion ID
    // Only indexes non-null values (smaller index)
    index("session_user_from_suggestion_idx")
      .on(table.userId, table.fromSuggestionId)
      .where(sql`from_suggestion_id IS NOT NULL`),

    // CHECK constraint: endTime must be after startTime
    check("session_end_after_start", sql`end_time > start_time`),
    // CHECK constraint: priority must be between 1 and 5
    check("session_priority_range", sql`priority >= 1 AND priority <= 5`),
    // CHECK constraint: completedAt must be consistent with completed field
    // If completed = true, completedAt must be set; if completed = false, completedAt must be NULL
    check(
      "session_completed_at_consistency",
      sql`(completed = true AND completed_at IS NOT NULL) OR (completed = false AND completed_at IS NULL)`,
    ),
    // CHECK constraint: completedAt must be >= startTime (can't complete before session starts)
    check(
      "session_completed_at_after_start",
      sql`completed_at IS NULL OR completed_at >= start_time`,
    ),
    // CHECK constraint: completedAt must be <= current timestamp (can't complete in the future)
    check(
      "session_completed_at_not_future",
      sql`completed_at IS NULL OR completed_at <= NOW()`,
    ),
    // CHECK constraint: completedAt must be >= createdAt (can't complete before creation)
    check(
      "session_completed_at_after_created",
      sql`completed_at IS NULL OR completed_at >= created_at`,
    ),
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
  fromSuggestionId: z.string().optional(),
  userId: z.uuid(),
}).omit({
  id: true,
  userId: true, // userId is added by the API from the session
  completedAt: true, // completedAt is set automatically when completed = true
  deletedAt: true, // deletedAt should never be set on creation
  createdAt: true,
  updatedAt: true,
});
