import type { DatabaseOrTransaction } from "./types";
import { db } from "../client";

/**
 * Execute a function within a database transaction
 */
export async function withTransaction<T>(
  fn: (tx: DatabaseOrTransaction) => Promise<T>,
  database: DatabaseOrTransaction = db,
): Promise<T> {
  // Check if we're already inside a transaction
  // Transactions don't have a transaction method
  if (
    !("transaction" in database) ||
    typeof database.transaction !== "function"
  ) {
    // Already inside a transaction, execute directly
    return fn(database);
  }

  // Start a new transaction
  return database.transaction(fn);
}

/**
 * Retry a transaction if it fails due to a serialization error
 * Useful for handling concurrent transaction conflicts
 */
export async function retryTransaction<T>(
  fn: (tx: DatabaseOrTransaction) => Promise<T>,
  maxRetries = 3,
  database: DatabaseOrTransaction = db,
): Promise<T> {
  let lastError: unknown;
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      return await withTransaction(fn, database);
    } catch (error) {
      lastError = error;
      attempts++;

      // Check if it's a serialization error (PostgreSQL error code 40001)
      const isSerializationError =
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "40001";

      if (!isSerializationError || attempts >= maxRetries) {
        throw error;
      }

      // Exponential backoff: wait 2^attempts * 10ms before retrying
      const delay = Math.min(2 ** attempts * 10, 1000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
