import { sql } from "drizzle-orm";
import { check, pgTable } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { User } from "./user";

/**
 * Profile table - additional user profile information
 */
export const Profile = pgTable(
  "profile",
  (t) => ({
    // Use userId as primary key since it's already unique (one profile per user)
    userId: t
      .uuid()
      .notNull()
      .primaryKey()
      .references(() => User.id, { onDelete: "cascade" }),
    timezone: t.varchar({ length: 50 }), // IANA timezone string (e.g., "America/New_York", "Europe/London")
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
  () => [
    // CHECK constraint: timezone must be NULL or match IANA timezone format
    // IANA timezones follow pattern: Continent/City or Continent/Region/City
    // Examples: "America/New_York", "Europe/London", "Asia/Tokyo", "UTC"
    // Pattern allows: letters, numbers, underscores, slashes, hyphens, plus signs
    check(
      "profile_timezone_format",
      sql`timezone IS NULL OR timezone ~ '^[A-Za-z0-9_+-]+(/[A-Za-z0-9_+-]+)+$' OR timezone = 'UTC'`,
    ),
  ],
);

export const CreateProfileSchema = createInsertSchema(Profile, {
  userId: z.uuid(),
  timezone: z.string().max(50).optional(),
}).omit({
  userId: true, // userId is added by the API from the session
  createdAt: true,
  updatedAt: true,
});
