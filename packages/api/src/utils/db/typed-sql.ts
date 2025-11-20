import type { PgTable, sql } from "@ssp/db";

import type { DatabaseOrTransaction } from "../types";

/**
 * Result type for paginated queries with total count
 */
export interface PaginatedResult<T> {
  rows: T[];
  total: number;
}

/**
 * Type-safe wrapper for raw SQL queries with pagination
 * Ensures proper type inference and validation
 *
 * Note: This function assumes the SQL query includes a window function
 * COUNT(*) OVER() that adds a total_count column to each row.
 */
export const executeTypedQuery = async <T>(
  database: DatabaseOrTransaction,
  _table: PgTable,
  query: ReturnType<typeof sql>,
): Promise<PaginatedResult<T>> => {
  const result = await database.execute(query);

  if (result.rows.length === 0) {
    return { rows: [], total: 0 };
  }

  // Validate that the first row has total_count (runtime validation)
  const firstRow = result.rows[0];
  if (!firstRow || typeof firstRow !== "object") {
    throw new Error("Invalid query result: expected object rows");
  }

  // Type assertion with runtime validation
  const firstRowTyped = firstRow as Record<string, unknown> & {
    total_count?: number | string;
  };

  // Extract and validate total_count
  // PostgreSQL returns integers as strings in some cases, so handle both
  const totalCountRaw = firstRowTyped.total_count;
  let total = 0;
  if (typeof totalCountRaw === "number") {
    total = totalCountRaw;
  } else if (typeof totalCountRaw === "string") {
    const parsed = Number.parseInt(totalCountRaw, 10);
    if (!Number.isNaN(parsed)) {
      total = parsed;
    } else {
      throw new Error(
        "Invalid query result: total_count must be a number or numeric string",
      );
    }
  }

  // Remove total_count from each row
  const rows = result.rows.map((row) => {
    const rowObj = row as Record<string, unknown> & { total_count?: unknown };
    const { total_count: _totalCount, ...data } = rowObj;
    return data as T;
  });

  return { rows, total };
};

/**
 * Type-safe wrapper for raw SQL queries without pagination
 * Ensures proper type inference and validation
 *
 * Note: This function performs basic runtime validation to ensure result structure
 * matches expectations. For full type safety, ensure your SQL query returns
 * data that matches the expected type T.
 */
export const executeTypedQuerySimple = async <T>(
  database: DatabaseOrTransaction,
  query: ReturnType<typeof sql>,
): Promise<T[]> => {
  const result = await database.execute(query);

  if (result.rows.length === 0) {
    return [];
  }

  // Validate that all rows are objects (runtime validation)
  // This prevents runtime errors from invalid query results
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows[i];
    if (!row || typeof row !== "object") {
      throw new Error(
        `Invalid query result at row ${i}: expected object, got ${typeof row}`,
      );
    }
  }

  // Type assertion is safe after runtime validation
  return result.rows as T[];
};
