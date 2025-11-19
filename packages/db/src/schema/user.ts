import { sql } from "drizzle-orm";
import { pgTable, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * User table - references Supabase auth.users
 * This stores application-specific user data
 * The id matches Supabase auth.users.id (UUID)
 */
export const User = pgTable("user", (t) => ({
  id: uuid("id").primaryKey(), // References Supabase auth.users.id
  name: t.text(),
  image: t.text(),
  createdAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => sql`now()`),
}));

export const CreateUserSchema = createInsertSchema(User, {
  name: z.string().max(256),
  image: z.string().max(256),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
