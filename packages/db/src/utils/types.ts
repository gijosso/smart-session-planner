import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";

import type { db } from "../client";
import type * as schema from "../schema";
import type { Availability, Profile, Session, User } from "../schema";

/**
 * Type that accepts both database and transaction objects
 * Used for functions that need to work within transactions
 */
export type DatabaseOrTransaction =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Database instance type
 * Useful for type annotations when you need the database type
 */
export type Database = NeonHttpDatabase<typeof schema>;

/**
 * Transaction type
 * The type of the transaction parameter in transaction callbacks
 */
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Infer types from Drizzle schema tables
 * These types are automatically inferred from the schema definitions
 */

// User table types
export type UserSelect = InferSelectModel<typeof User>;
export type UserInsert = InferInsertModel<typeof User>;

// Profile table types
export type ProfileSelect = InferSelectModel<typeof Profile>;
export type ProfileInsert = InferInsertModel<typeof Profile>;

// Session table types
export type SessionSelect = InferSelectModel<typeof Session>;
export type SessionInsert = InferInsertModel<typeof Session>;

// Availability table types
export type AvailabilitySelect = InferSelectModel<typeof Availability>;
export type AvailabilityInsert = InferInsertModel<typeof Availability>;
