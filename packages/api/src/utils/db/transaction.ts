import type { db } from "@ssp/db/client";
import { sql } from "@ssp/db";

/**
 * Transaction isolation levels for PostgreSQL
 * See: https://www.postgresql.org/docs/current/transaction-iso.html
 */
export type IsolationLevel =
  | "READ UNCOMMITTED" // Not supported in PostgreSQL (treated as READ COMMITTED)
  | "READ COMMITTED" // Default isolation level
  | "REPEATABLE READ"
  | "SERIALIZABLE"; // Strictest isolation level, prevents all anomalies

/**
 * Execute a transaction with a specific isolation level
 *
 * Sets the transaction isolation level using raw SQL as the first statement
 * in the transaction. This ensures proper isolation for conflict-sensitive operations.
 *
 * IMPORTANT: The isolation level must be set as the FIRST statement in the transaction.
 * PostgreSQL requires this, and it cannot be changed after other statements execute.
 *
 * Implementation: Uses Drizzle's sql template literal with validated constant strings.
 * The isolation level is validated against a whitelist to prevent SQL injection.
 */
export async function transactionWithIsolation<T>(
  database: typeof db,
  callback: (
    tx: Parameters<Parameters<typeof database.transaction>[0]>[0],
  ) => Promise<T>,
  isolationLevel: IsolationLevel = "READ COMMITTED",
): Promise<T> {
  return await database.transaction(async (tx) => {
    // Set isolation level as the FIRST statement in the transaction
    // PostgreSQL requires this to be executed before any other statements
    if (isolationLevel !== "READ COMMITTED") {
      // Validate isolation level to prevent SQL injection
      // Only allow known safe values
      const validLevels: readonly IsolationLevel[] = [
        "REPEATABLE READ",
        "SERIALIZABLE",
      ] as const;

      if (!validLevels.includes(isolationLevel as IsolationLevel)) {
        throw new Error(
          `Invalid isolation level: ${isolationLevel}. Must be one of: ${validLevels.join(", ")}`,
        );
      }

      // Execute SET TRANSACTION ISOLATION LEVEL as raw SQL
      // Since isolationLevel is validated against a whitelist, it's safe to use directly
      // Use sql.raw() to execute the raw SQL statement
      // Note: sql.raw() is available in drizzle-orm and is safe here because
      // isolationLevel is validated against a whitelist of known safe values
      await tx.execute(
        sql.raw(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`),
      );
    }

    // Now execute the actual transaction logic
    return await callback(tx);
  });
}
