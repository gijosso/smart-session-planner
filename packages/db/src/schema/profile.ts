import { sql } from "drizzle-orm";
import { pgTable } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { User } from "./user";

/**
 * Profile table - additional user profile information
 */
export const Profile = pgTable("profile", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  userId: t
    .uuid()
    .notNull()
    .references(() => User.id, { onDelete: "cascade" })
    .unique(), // One profile per user
  timezone: t.varchar({ length: 50 }), // IANA timezone string (e.g., "America/New_York", "Europe/London")
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$onUpdateFn(() => sql`now()`),
}));

export const CreateProfileSchema = createInsertSchema(Profile, {
  userId: z.uuid(),
  timezone: z.string().max(50).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
