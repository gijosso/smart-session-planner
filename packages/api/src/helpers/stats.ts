import type { db } from "@ssp/db/client";
import { count, eq, sql } from "@ssp/db";
import { Session, SESSION_TYPES } from "@ssp/db/schema";

export interface SessionStats {
  total: number;
  completed: number;
  pending: number;
  completionRate: number; // Percentage (0-100)
  byType: Record<(typeof SESSION_TYPES)[number], number>;
}

/**
 * Get session statistics for a user
 * Optimized: Uses SQL aggregations (COUNT, GROUP BY) instead of fetching all sessions
 *
 * Performance benefits:
 * - Runs entirely in database (no data transfer)
 * - Uses database indexes efficiently
 * - Scales well as session count grows (O(1) data transfer vs O(n))
 * - Single query for type breakdown (GROUP BY)
 *
 * This is server-side optimized and pre-computed on each request.
 * For even better performance, consider:
 * - Adding database indexes on (user_id, completed) and (user_id, type)
 * - Caching results with TTL (e.g., Redis) if needed
 * - Materialized views for very large datasets
 */
export async function getSessionStats(
  database: typeof db,
  userId: string,
): Promise<SessionStats> {
  // Single query for total and completed counts using conditional aggregation
  const [summaryResult] = await database
    .select({
      total: count(),
      completed: sql<number>`count(*) filter (where ${Session.completed} = true)`,
    })
    .from(Session)
    .where(eq(Session.userId, userId));

  // Single query for breakdown by type using GROUP BY
  const typeBreakdown = await database
    .select({
      type: Session.type,
      count: count(),
    })
    .from(Session)
    .where(eq(Session.userId, userId))
    .groupBy(Session.type);

  const total = summaryResult?.total ?? 0;
  const completed = Number(summaryResult?.completed ?? 0);
  const pending = total - completed;

  // Initialize all types to 0
  const byType = {} as Record<(typeof SESSION_TYPES)[number], number>;
  for (const type of SESSION_TYPES) {
    byType[type] = 0;
  }

  // Populate from database results
  for (const row of typeBreakdown) {
    byType[row.type] = row.count;
  }

  // Calculate completion rate
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    pending,
    completionRate,
    byType,
  };
}
