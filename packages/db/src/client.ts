import { neon } from "@neondatabase/serverless";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

/**
 * Database client instance (lazy initialized)
 * This is initialized on first access, allowing for better testability
 * and avoiding module-level side effects
 */
let dbInstance: NeonHttpDatabase<typeof schema> | null = null;

/**
 * Get the database connection URL from environment variables
 * @throws {Error} If POSTGRES_URL is not set
 */
function getDatabaseUrl(): string {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      "Missing POSTGRES_URL environment variable. Please ensure it is set in your .env file.",
    );
  }
  return url;
}

/**
 * Initialize the database client
 * This function can be called explicitly for testing or lazy initialization
 */
function initializeDb(): NeonHttpDatabase<typeof schema> {
  const url = getDatabaseUrl();
  const sql = neon(url);
  return drizzle({
    client: sql,
    schema,
    casing: "snake_case",
  });
}

/**
 * Get the database instance (lazy initialization)
 * The database is initialized on first access
 */
function getDb(): NeonHttpDatabase<typeof schema> {
  if (!dbInstance) {
    dbInstance = initializeDb();
  }
  return dbInstance;
}

/**
 * Set a custom database instance (useful for testing)
 * @param instance - The database instance to use
 */
export function setDb(instance: NeonHttpDatabase<typeof schema> | null): void {
  dbInstance = instance;
}

/**
 * Database client export
 * Uses lazy initialization via a getter - the database is only initialized when first accessed
 * This allows the module to be imported without requiring POSTGRES_URL to be set
 * (useful for testing and conditional imports)
 *
 * The getter maintains the same interface as the original export, so existing code
 * continues to work without changes.
 */
export const db: NeonHttpDatabase<typeof schema> = new Proxy(
  {} as NeonHttpDatabase<typeof schema>,
  {
    get(_target, prop, receiver) {
      const instance = getDb();
      const value = instance[prop as keyof typeof instance];
      if (typeof value === "function") {
        return value.bind(instance);
      }
      return value;
    },
    has(_target, prop) {
      return prop in getDb();
    },
    ownKeys(_target) {
      return Reflect.ownKeys(getDb());
    },
    getOwnPropertyDescriptor(_target, prop) {
      return Reflect.getOwnPropertyDescriptor(getDb(), prop);
    },
  },
);
